---
title: "让 Tailscale Exit Node 的流量经过 Mihomo"
description: "救援通道、最小范围的 TUN 接管、DNS 污染排查、最终实现通过 Exit Node 使用 Mihomo 代理"
date: 2026-09-03
lang: "zh-CN"
translationSlug: "tailscale-exit-node-through-mihomo"
author: "konakona"
---

我在家里的 NAS（下文称为 `nasRemote`）上运行了 Mihomo，也把这台机器配置成了 Tailscale Exit Node。最初，两者是完全独立的：手机可以把 `nasRemote` 当作出口节点，但离开 Tailscale 后，流量仍然直接从 NAS 的默认网络出口访问互联网，不会经过 Mihomo。

我想实现的链路是：

```text
iPhone
  → Tailscale
  → nasRemote 上的 tailscaled Exit Node
  → Mihomo TUN
  → 复用现有 config.yaml 的规则
  → 代理节点或 DIRECT
  → Internet
```

本文记录实现这一链路的过程。

## 先解决失联风险

当时 Mac 只能通过 Tailscale 连接 `nasRemote`。如果 TUN 路由误伤了 Tailscale 自身，远程修复配置的入口也会一起消失。因此，我没有直接修改 Mihomo，而是先建立一条完全不依赖 Tailscale 的救援通道。

我的另一台服务器 `serJP` 同时能被 Mac 和 `nasRemote` 访问，所以可以让 NAS 主动向 `serJP` 建立反向 SSH 隧道：

```text
Mac → serJP:22022 → reverse SSH tunnel → nasRemote:22
```

其核心等价于在 NAS 上运行：

```bash
ssh -N -R 127.0.0.1:22022:127.0.0.1:22 serJP
```

我把它做成了 `nasRemote` 上的 systemd 服务，并使用一把专用密钥。`serJP` 上对应的 `authorized_keys` 条目只允许端口转发，不允许获得 shell，同时将监听地址限制为 `127.0.0.1:22022`。这样，救援端口不会直接暴露到公网。

Mac 再通过 `ProxyJump serJP` 建立一个 `nasRescue` SSH 别名。**这条救援链路平时也有用：即使 Tailscale 控制面、DNS 或路由出了问题，我仍然可以从 `serJP` 回到 NAS。**

## 让用户态 Mihomo 使用 TUN

Mihomo 原本由普通用户 `nas` 运行。我不想为了 TUN 直接把整个进程改成 `root`，而是通过 systemd 只授予它创建和管理网络接口所需的能力：

```ini
[Service]
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_RAW
```

服务仍然以 `User=nas` 运行，只额外获得 `CAP_NET_ADMIN` 和 `CAP_NET_RAW`。

接着在现有 `config.yaml` 中加入 TUN 配置：

```yaml
tun:
  enable: true
  stack: mixed
  auto-route: true
  auto-redirect: true
  auto-detect-interface: true
  include-interface:
    - tailscale0
  route-exclude-address:
    - 10.0.0.0/8
    - 100.64.0.0/10
    - 127.0.0.0/8
    - 169.254.0.0/16
    - 172.16.0.0/12
    - 192.168.0.0/16
    - ::1/128
    - fd7a:115c:a1e0::/48
    - fe80::/10
```

这里最重要的限制是 `include-interface: tailscale0`。它让 Mihomo 只接管从 Tailscale 接口进入的 Exit Node 流量，而不是把 NAS 自己的全部网络连接都塞进 TUN。私有地址、Tailscale CGNAT 地址和本地 IPv6 地址也被排除，避免管理流量和内部服务发生递归路由。

我保留了现有配置中的全部代理组和规则。换句话说，TUN 只改变“流量如何进入 Mihomo”，进入之后仍由原来的 `config.yaml` 决定走代理还是 `DIRECT`。

我也刻意没有配置 `dns-hijack`。Tailscale 的 MagicDNS 和 `tailscaled` 自己仍然需要正常工作；在没有必要的情况下劫持 DNS，会扩大这次改动的影响范围。

## 用嗅探恢复域名规则

TUN 最初拿到的通常只是目标 IP，而现有规则中有大量域名规则。为了继续复用这些规则，我启用了 HTTP、TLS 和 QUIC 嗅探：

```yaml
sniffer:
  enable: true
  parse-pure-ip: true
  override-destination: false
  sniff:
    HTTP:
      ports:
        - 80
        - 8080-8880
    TLS:
      ports:
        - 443
        - 8443
    QUIC:
      ports:
        - 443
        - 8443
```

一开始我把 `override-destination` 设为 `false`，想让 Mihomo 只用嗅探到的域名匹配规则，但不要改变客户端原本请求的目标地址。这个选择看起来更保守，后来却暴露了一些问题。

## 可回滚地启用配置

远程修改网络路径时，不能把“配置语法正确”等同于“网络一定不会断”。实际启用前的流程是：

1. 备份当前 `config.yaml`、配置生成脚本和 systemd drop-in。
2. 使用 `mihomo -t` 检查完整配置。
3. 设置一个延迟执行的 systemd 回滚任务。
4. 只重启 Mihomo，不重启 `tailscaled`。
5. 同时验证 Tailscale SSH 和 `nasRescue`。
6. 验证 MagicDNS、NAS 上的其他服务和 Mihomo 控制面。
7. 确认一切正常后，取消回滚任务。

启用后，iPhone 通过 Exit Node 访问 `ifconfig.me`，看到的已经是 Mihomo 代理节点的公网 IP。这说明主链路确实变成了：

```text
iPhone → Tailscale → nasRemote → Mihomo → 代理节点
```

但事情还没有结束。

## 出口 IP 正确，部分网站仍然打不开

实际测试中发现了如下现象：

- `x.com` 可以正常访问。
- `ifconfig.me` 显示的是代理出口 IP。
- Google、YouTube 和 Instagram 无法访问。

第一反应很容易怀疑 GFW 是否在识别并干扰 Tailscale 的 UDP 流量。但这个解释与现象并不吻合：Tailscale 连接仍然活跃，iPhone 与 NAS 之间是直连 WireGuard 路径，而且大量其他流量可以正常传输。如果 Tailscale 的加密隧道本身遭到选择性阻断，很难解释为什么同一条隧道里的 `x.com` 和出口 IP 检测都完全正常。

真正的线索来自 Mihomo 日志。失败请求中出现了明显不合理的目标地址：

- Google 域名被解析到 Meta/Facebook 的地址段。
- YouTube 也被解析到 Meta 的地址。
- 部分请求甚至得到与目标服务完全无关的 IPv4 或 IPv6 地址。

这是典型的 GFW DNS 污染现象：域名查询返回了错误的 IP，导致 Mihomo 连接到错误的服务器。由于这些 IP 并不提供预期的服务，连接会报 TLS 错误或超时。Mihomo 的 sniffer 已经从 TLS 或 QUIC 流量中识别出 `google`、`youtube` 和 `instagram`，因此规则匹配是正确的，流量也选择了预期的代理组。问题在于：

```yaml
override-destination: false
```

这个设置只让嗅探到的域名参与规则判断，实际连接仍然使用客户端拿到的那个错误 IP。

## DNS 污染发生在哪一层

Tailscale 负责把 iPhone 的数据加密传到 Exit Node，但加密隧道并不会自动保证所有外部域名都通过可信 DNS 解析。如果域名查询最终从 NAS 一侧发往普通明文 DNS 上游，返回结果仍然可能被注入或污染。随后，iPhone 会把错误的目标 IP 放进已经加密的 Tailscale 数据包中。

从外部看，GFW 看不到 WireGuard 包里的域名和目标地址；但它可以影响发生在隧道外、NAS 上游网络中的普通 DNS 请求。Tailscale 只是可靠地把这个错误结果对应的连接送到了 Exit Node。

## 用 `override-destination` 修复最终连接

修复只需要改一个选项：

```yaml
sniffer:
  enable: true
  parse-pure-ip: true
  override-destination: true
```

开启后，Mihomo 不再只把嗅探到的域名用于规则匹配，还会用它替换错误的目标 IP。后续代理连接以真实域名为目标，由代理路径完成正确的解析和连接。

新的实际流程变成：

```text
客户端 DNS 得到错误 IP
  → 请求通过 Tailscale 到达 nasRemote
  → Mihomo 从 TLS/QUIC 中识别真实域名
  → 现有域名规则选择代理组
  → 用真实域名替换错误 IP
  → 代理侧解析并连接真实服务
```

这个选项并非没有代价。对于故意让 SNI 与目标 IP 不一致、使用特殊域名前置方式，或无法被当前 sniffer 识别的连接，重写目标地址可能改变应用预期；ECH 等无法提供可见域名的流量也不能依赖这种方式修复。不过本次 TUN 只接管 `tailscale0`，影响范围限于 Exit Node 客户端，而不是 NAS 上的全部服务。

## 结论

让 Tailscale Exit Node 的流量经过 Mihomo 是可行的。最终方案的关键点有四个：

1. 在改变远程网络路径前，先建立一条不依赖 Tailscale 的救援通道。
2. 只给 Mihomo 必要的网络能力，并用 `include-interface: tailscale0` 限制 TUN 的接管范围。
3. 不改动已有代理组和规则，让 TUN 流量继续复用原来的 `config.yaml`。
4. 当 DNS 已经给出错误 IP 时，仅用域名做规则匹配还不够；需要 `override-destination: true` 修正实际连接目标。
