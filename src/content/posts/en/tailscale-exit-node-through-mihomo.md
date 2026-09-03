---
title: "Routing Tailscale exit node traffic through Mihomo"
description: "A rescue tunnel, narrowly scoped TUN interception, and a DNS poisoning investigation that made a Tailscale exit node work with Mihomo"
date: 2026-09-03
lang: "en"
translationSlug: "tailscale-exit-node-through-mihomo"
author: "konakona"
---

I run Mihomo on my home NAS, which I will call `nasRemote`, and also use that machine as a Tailscale exit node. The two originally operated independently: my phone could use `nasRemote` as its exit node, but traffic leaving Tailscale still went directly through the NAS's default network gateway instead of passing through Mihomo.

I wanted to build this path:

```text
iPhone
  → Tailscale
  → tailscaled exit node on nasRemote
  → Mihomo TUN
  → existing rules in config.yaml
  → proxy node or DIRECT
  → Internet
```

This post documents how I made that path work.

## Protecting the recovery path first

At the time, my Mac could reach `nasRemote` only through Tailscale. If the TUN routes interfered with Tailscale itself, I would also lose the only connection I could use to repair the configuration. Before changing Mihomo, I therefore created a rescue path that did not depend on Tailscale.

Both my Mac and `nasRemote` could reach another server, `serJP`, so I had the NAS establish a reverse SSH tunnel to it:

```text
Mac → serJP:22022 → reverse SSH tunnel → nasRemote:22
```

The tunnel is equivalent to running this command on the NAS:

```bash
ssh -N -R 127.0.0.1:22022:127.0.0.1:22 serJP
```

I turned it into a systemd service on `nasRemote` and gave it a dedicated key. The corresponding `authorized_keys` entry on `serJP` permits port forwarding but does not provide a shell. It also limits the listener to `127.0.0.1:22022`, so the rescue port is not exposed directly to the public internet.

On the Mac, I then created a `nasRescue` SSH alias that uses `ProxyJump serJP`. **This rescue path is useful beyond this particular change: if Tailscale's control plane, DNS, or routing fails, I can still reach the NAS through `serJP`.**

## Giving a user-level Mihomo process access to TUN

Mihomo originally ran as the unprivileged user `nas`. I did not want to run the entire process as `root` just to use TUN, so I granted it only the capabilities required to create and manage network interfaces through systemd:

```ini
[Service]
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_RAW
```

The service continues to run with `User=nas`; it only gains `CAP_NET_ADMIN` and `CAP_NET_RAW`.

I then added the TUN configuration to the existing `config.yaml`:

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

The most important constraint is `include-interface: tailscale0`. It tells Mihomo to intercept only exit-node traffic entering through the Tailscale interface, instead of sending every connection made by the NAS into the TUN. I also excluded private, Tailscale CGNAT, and local IPv6 ranges to prevent recursive routing of management traffic and internal services.

I kept all proxy groups and rules from the existing configuration. In other words, TUN changes only how traffic enters Mihomo. The original `config.yaml` still decides whether that traffic uses a proxy or `DIRECT`.

I also deliberately left `dns-hijack` unset. Tailscale's MagicDNS and `tailscaled` still need to work normally, and hijacking DNS without a clear need would increase the scope of the change.

## Recovering domain-based rules with sniffing

TUN often receives only a destination IP, while the existing configuration contains many domain-based rules. To keep using those rules, I enabled HTTP, TLS, and QUIC sniffing:

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

I initially set `override-destination` to `false`. I wanted Mihomo to use the sniffed domain for rule matching without changing the destination originally requested by the client. This looked like the more conservative option, but it later exposed another problem.

## Enabling the configuration with a rollback

When changing a remote network path, a syntactically valid configuration does not mean the connection will remain available. I used the following rollout process:

1. Back up the current `config.yaml`, the configuration generator, and the systemd drop-in.
2. Validate the complete configuration with `mihomo -t`.
3. Schedule a delayed systemd rollback job.
4. Restart only Mihomo, not `tailscaled`.
5. Test both Tailscale SSH and `nasRescue`.
6. Check MagicDNS, other NAS services, and the Mihomo control plane.
7. Cancel the rollback job after confirming that everything works.

After enabling TUN, I opened `ifconfig.me` from the iPhone while using the exit node. It reported the public IP of the Mihomo proxy node. This confirmed that the main path had changed to:

```text
iPhone → Tailscale → nasRemote → Mihomo → proxy node
```

But the work was not finished.

## The exit IP was correct, but some sites still failed

Testing produced an unusual combination of results:

- `x.com` worked normally.
- `ifconfig.me` showed the proxy's exit IP.
- Google, YouTube, and Instagram did not load.

My first suspicion was that China's Great Firewall (GFW) might be identifying and interfering with Tailscale's UDP traffic. The evidence did not fit that explanation. The Tailscale connection remained active, the iPhone had a direct WireGuard path to the NAS, and plenty of other traffic crossed the same tunnel successfully. Selective blocking of the encrypted Tailscale tunnel would not readily explain why `x.com` and the exit-IP test both worked through it.

The useful evidence came from Mihomo's logs. Failed requests contained clearly incorrect destinations:

- Google domains resolved to addresses belonging to Meta/Facebook.
- YouTube also resolved to a Meta address.
- Some requests received unrelated IPv4 or IPv6 addresses.

This is a typical symptom of DNS poisoning by GFW: DNS queries return incorrect IP addresses, causing Mihomo to connect to the wrong servers. Because those addresses do not serve the expected sites, the connections fail with TLS errors or timeouts. Mihomo's sniffer had already identified `google`, `youtube`, and `instagram` from the TLS or QUIC traffic, so rule matching was correct and the expected proxy group was selected. The problem was this setting:

```yaml
override-destination: false
```

It allowed the sniffed domain to participate in rule matching, but the actual connection still used the incorrect IP address received by the client.

## Where the DNS poisoning occurred

Tailscale encrypts the iPhone's traffic on its way to the exit node, but that tunnel does not automatically guarantee that every external domain is resolved through a trusted DNS service. If a query eventually leaves through an ordinary, unencrypted DNS upstream on the NAS side, its response can still be injected or poisoned. The iPhone then places the resulting incorrect destination IP inside an encrypted Tailscale packet.

An observer outside the tunnel cannot read the domain or destination address inside the WireGuard packets, but it can interfere with ordinary DNS queries that occur outside the tunnel on the NAS's upstream network. Tailscale then reliably delivers the connection for that incorrect result to the exit node.

## Replacing the destination with `override-destination`

The fix required changing one option:

```yaml
sniffer:
  enable: true
  parse-pure-ip: true
  override-destination: true
```

With this option enabled, Mihomo does more than use the sniffed domain for rule matching. It also replaces the incorrect destination IP with that domain. The proxy connection then targets the real domain and resolves it through the proxy path.

The effective flow becomes:

```text
Client receives an incorrect IP from DNS
  → request reaches nasRemote through Tailscale
  → Mihomo identifies the real domain from TLS/QUIC
  → existing domain rules select a proxy group
  → real domain replaces the incorrect IP
  → proxy side resolves and connects to the real service
```

This option has tradeoffs. Rewriting the destination can change the behavior of applications that intentionally use a different SNI and destination IP, rely on domain fronting, or use connections that the configured sniffer cannot identify. Traffic using Encrypted Client Hello (ECH), for example, cannot rely on this approach if Mihomo cannot see the domain. In this setup, however, TUN intercepts only `tailscale0`, so the impact is limited to exit-node clients rather than every service on the NAS.

## Conclusion

Routing Tailscale exit-node traffic through Mihomo is practical. Four details made the final setup work:

1. Create a rescue path that does not depend on Tailscale before changing remote network routes.
2. Give Mihomo only the capabilities it needs, and limit TUN interception with `include-interface: tailscale0`.
3. Keep the existing proxy groups and rules so TUN traffic continues to use the original `config.yaml`.
4. When DNS has already returned an incorrect IP, domain-based rule matching alone is not enough. Use `override-destination: true` to correct the actual connection target.
