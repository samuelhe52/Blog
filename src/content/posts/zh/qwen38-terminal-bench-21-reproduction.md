---
title: "Qwen3.8-27B Terminal-Bench 2.1 复现：环境、完整流程与踩坑记录"
description: "使用 SGLang、Harbor 0.21.0 和 Terminus-2，在 16 张 A100 40GB GPU 上复现 Qwen3.8-27B Terminal-Bench 2.1 的完整过程、问题排查与结果审计。"
date: 2026-09-01
lang: "zh-CN"
translationSlug: "qwen38-terminal-bench-21-reproduction"
author: "konakona"
---

<!-- markdownlint-disable MD013 MD024 -->

这篇文章记录我们使用 SGLang、Harbor 0.21.0 和 Terminus-2，在 16 张 A100 40GB GPU 上复现 Qwen3.8-27B Terminal-Bench 2.1 的完整过程。**其实真正最消耗时间的不是跑 benchmark 本身，而是在不断试错过程中可能需要额外跑很多次 benchmark 才能抓到各种 edge cases，最终拿到一个比较可信的结果。本文旨在尽量让读者避开这些坑。**

> 本文记录的过程和坑都有时效性，仅作参考。实验在 8.29-8.31 间完成。

本文分为四部分：

1. 实验环境和组件关系；
2. 从环境准备到启动 89-task full run 的完整 manual；
3. 实验中遇到的问题、定位过程和解决方法；
4. 最终 config 下实验结果。

## 环境介绍

### Benchmark 和 harness

| 组件             | 配置                                       |
| ---------------- | ------------------------------------------ |
| 模型             | `Qwen/Qwen3.8-27B`，BF16                   |
| 推理后端         | SGLang Docker runtime                      |
| Benchmark        | Terminal-Bench 2.1，89 tasks               |
| Benchmark commit | `7131e4375048a0e408a8fb404b5f499d726b695b` |
| Runner           | Harbor 0.21.0                              |
| Agent harness    | Terminus-2                                 |
| Sandbox runtime  | Docker + Docker Compose                    |

Terminal-Bench 2.1（下称 TB）的任务使用 Harbor 的格式定义，并依赖其执行。Harbor 会为每个 trial 启动独立的 task container，在其中运行 Terminus-2、记录 terminal session，最后执行 task 自带的 verifier。**需要注意的是，TB 采用 shared container，也就是 task container 和 verifier 共享同一个运行环境。后面我们会看到这一机制带来的问题。**

### 硬件和服务拓扑

最终实验使用两台 AMD64 Linux 服务器，每台服务器 8 张 A100-SXM4-40GB：

| 节点     |          GPU | SGLang 配置 | 作用                                |
| -------- | -----------: | ----------- | ----------------------------------- |
| Worker A | 8× A100 40GB | TP=4，DP=2  | 提供两个 inference replica          |
| Worker B | 8× A100 40GB | TP=4，DP=2  | 两个 replica；运行 router 和 Harbor |

两个 worker 通过内网向 SGLang router 提供服务。Harbor 只访问 router，不直接选择某一个 inference replica：

```text
                       ┌─────────────────────────────┐
                       │ Harbor 0.21.0 + Terminus-2  │
                       │ 25 trials / 20 agents       │
                       └──────────────┬──────────────┘
                                      │ OpenAI-compatible API
                                      ▼
                       ┌─────────────────────────────┐
                       │ SGLang global router        │
                       │ 127.0.0.1:30000             │
                       └──────────┬───────────┬──────┘
                                  │           │
                   ┌──────────────▼──┐     ┌──▼───────────────┐
                   │ Worker A        │     │ Worker B         │
                   │ TP=4, DP=2      │     │ TP=4, DP=2       │
                   │ private-ip:30001│     │ private-ip:30001 │
                   └─────────────────┘     └──────────────────┘
```

### 最终 6× run 参数

`6x` 指 `agent_timeout_multiplier=6`，此配置是为了解决 Qwen 3.8-27B 严重的 overthinking 导致的 agent 超时问题。最终实验使用以下 serving 和 sampling 配置：

| 参数                           |                    值 |
| ------------------------------ | --------------------- |
| GPU                            |    16× A100-SXM4-40GB |
| TP × DP                        |        每台机器 4 × 2 |
| Inference replicas             |                     4 |
| Context length                 |                262144 |
| Maximum input tokens           |                262144 |
| Maximum output tokens          |                 65536 |
| Maximum total tokens           |       SGLang 自动计算 |
| Maximum running requests       | 每个 replica 5，共 20 |
| Maximum Mamba cache size       |       每个 replica 25 |
| `mem_fraction_static`          |                  0.90 |
| Reasoning parser               |               `qwen3` |
| Tool-call parser               |         `qwen3_coder` |
| Temperature                    |                   1.0 |
| `top_p`                        |                  0.95 |
| `top_k`                        |                未设置 |
| Harbor trial concurrency       |                    25 |
| Terminus agent concurrency     |                    20 |
| **Agent timeout multiplier**   |                 **6** |
| Agent setup timeout multiplier |                     5 |

### 前置条件

检查两台服务器已经满足以下条件：

- AMD64 Linux；
- Docker 和 NVIDIA Container Toolkit 已正确安装；
- 当前用户可以运行带 GPU 的 Docker container；
- 两台机器之间有可互访的内网地址；
- BF16 checkpoint 已存在于两台机器的本地磁盘；
- SGLang runtime image 已下载为 Docker image 或 tar archive；
- Worker B 有足够空间保存 89 个 Terminal-Bench task images 和运行 artifacts；
- 长时间运行的进程使用 `tmux` 和持久日志，不依赖 SSH session 存活。

下面使用这些变量表示本地环境。请在执行命令前替换地址和路径：

```bash
export WORKSPACE=/home/YOUR_USER/tb21-reproduction
export MODEL_PATH="$WORKSPACE/models/Qwen3.8-27B"
export SGLANG_IMAGE=lmsysorg/sglang:latest-runtime

export WORKER_A_IP=10.0.0.11
export WORKER_B_IP=10.0.0.12
export WORKER_PORT=30001
export ROUTER_PORT=30000
```

`WORKER_A_IP` 和 `WORKER_B_IP` 必须是两台服务器之间可以直接访问的内网地址。

## 复现 manual

> 以下是完整的复现流程，较为冗长；可以跳到 [踩坑及解决方案](#踩坑及解决方案) 直接看问题排查。

这一节只保留最终采用的正确路径。为了让问题尽早暴露，每一个启动步骤后都附带对应的验证命令。

### 安装基础工具

在两台机器上准备要用到的包。以 Ubuntu 为例：

```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  curl \
  git \
  jq \
  python3 \
  skopeo \
  socat \
  tmux
```

### 准备 SGLang image 和模型

在两台机器上分别拉取 SGLang image：

```bash
docker pull "$SGLANG_IMAGE"
docker image inspect "$SGLANG_IMAGE" \
  --format 'id={{.Id}} architecture={{.Architecture}} created={{.Created}}'
```

docker pull 如果需走代理，要在 docker daemon 中配置；也可以通过 `skopeo copy` （可直接识别 proxy vars）先下载 image archive，再在两台机器上 `docker load`。

### 在 Worker B 安装 Harbor 0.21.0

以下步骤只需要在运行 Harbor 的 Worker B 上执行。

先准备目录：

```bash
mkdir -p \
  "$WORKSPACE/bin" \
  "$WORKSPACE/logs" \
  "$WORKSPACE/results"

export UV_INSTALL_DIR="$WORKSPACE/bin"
export PATH="$UV_INSTALL_DIR:$PATH"
```

安装 `uv` 和 Python 3.13：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install 3.13
```

下载 Harbor 0.21.0 wheel，并校验本次实验使用的文件：

```bash
export HARBOR_WHEEL="$WORKSPACE/harbor-0.21.0-py3-none-any.whl"
export HARBOR_WHEEL_SHA256=c77d779a03f1a9e8ecb3c449e17f39a9728b82238832f1fd28632eb9426c0a21

wheel_url=$(curl -fsSL https://pypi.org/pypi/harbor/0.21.0/json \
  | jq -r '.urls[] | select(.filename == "harbor-0.21.0-py3-none-any.whl") | .url')

curl -fsSL "$wheel_url" -o "$HARBOR_WHEEL"
printf '%s  %s\n' "$HARBOR_WHEEL_SHA256" "$HARBOR_WHEEL" \
  | sha256sum -c -
```

创建独立环境并安装 Harbor：

```bash
export HARBOR_VENV="$WORKSPACE/.venv-harbor-0.21.0"

uv venv --python 3.13 "$HARBOR_VENV"
uv pip install --python "$HARBOR_VENV/bin/python" "$HARBOR_WHEEL"
uv pip freeze --python "$HARBOR_VENV/bin/python" \
  > "$WORKSPACE/logs/harbor-0.21.0-freeze.txt"

"$HARBOR_VENV/bin/python" --version
"$HARBOR_VENV/bin/harbor" --version
```

### 下载并固定 Terminal-Bench 2.1

克隆任务仓库，并固定到本次实验使用的 commit：

```bash
export TB21_ROOT="$WORKSPACE/terminal-bench-2-1"
export TASK_ROOT="$TB21_ROOT/tasks"

git clone \
  https://github.com/harbor-framework/terminal-bench-2-1.git \
  "$TB21_ROOT"

git -C "$TB21_ROOT" checkout --detach \
  7131e4375048a0e408a8fb404b5f499d726b695b
```

确认 task 数量：

```bash
find "$TASK_ROOT" -mindepth 2 -maxdepth 2 -name task.toml -type f \
  | wc -l
```

预期结果为 `89`。

### 拉取 89 个 task images

先从各任务的 `task.toml` 提取并去重 Docker image：

```bash
export IMAGE_MANIFEST="$WORKSPACE/images-amd64.txt"

find "$TASK_ROOT" -name task.toml -type f -print0 \
  | xargs -0 awk -F ' = ' \
      '$1 == "docker_image" {gsub(/"/, "", $2); print $2}' \
  | sort -u \
  > "$IMAGE_MANIFEST"

wc -l "$IMAGE_MANIFEST"
```

考虑到代理使用方便，我们使用 `skopeo` 下载 AMD64 image archive，再显式导入 Docker。

> 若网络环境良好，也可以直接使用 `docker pull` 批量拉取。

准备临时目录：

```bash
export IMAGE_SCRATCH="$WORKSPACE/image-downloads"
mkdir -p "$IMAGE_SCRATCH"
```

逐个下载并校验 architecture：

```bash
while IFS= read -r image; do
  if docker image inspect "$image" >/dev/null 2>&1; then
    printf 'cached %s\n' "$image"
    continue
  fi

  archive_name=${image//\//_}
  archive_name=${archive_name//:/_}
  archive="$IMAGE_SCRATCH/${archive_name}.tar"

  copied=false
  for attempt in 1 2 3 4 5; do
    rm -f -- "$archive"
    if skopeo copy \
      --override-os linux \
      --override-arch amd64 \
      "docker://$image" \
      "docker-archive:$archive"; then
      copied=true
      break
    fi
    sleep "$((attempt * 5))"
  done

  if [[ "$copied" != true ]]; then
    printf 'failed to download %s\n' "$image" >&2
    exit 1
  fi

  config_file=$(tar -xOf "$archive" manifest.json | jq -r '.[0].Config')
  image_id="sha256:${config_file%.json}"

  docker load -i "$archive"
  docker tag "$image_id" "$image"
  rm -f -- "$archive"

  architecture=$(docker image inspect "$image" --format '{{.Architecture}}')
  [[ "$architecture" == amd64 ]] || {
    printf 'unexpected architecture for %s: %s\n' "$image" "$architecture" >&2
    exit 1
  }
done < "$IMAGE_MANIFEST"
```

最后重新统计已就绪的 images：

```bash
ready=0
while IFS= read -r image; do
  if docker image inspect "$image" >/dev/null 2>&1; then
    ready=$((ready + 1))
  fi
done < "$IMAGE_MANIFEST"

printf '%s/89 images ready\n' "$ready"
```

### 为 task containers 准备 `tmux` 和 `asciinema`

Terminus-2 需要在 task container 内使用 `tmux` 和 `asciinema`。**部分 task images 没有预装这两个工具。如果让 Harbor 在每个 container 中临时下载，网络波动或并发限流可能导致 setup timeout。**

我们的处理方式是，在宿主机准备一个可挂载的 AMD64 tool bundle，并把它映射到每个 task container 的 `/usr/bin`。

以下命令使用宿主机的 `tmux` 和 Python runtime。先确定 Python 版本和标准库位置：

```bash
export TOOLS_DIR="$WORKSPACE/harbor-tools-amd64"
export HOST_TMUX=$(command -v tmux)
export HOST_PYTHON=$(command -v python3)
export PYTHON_VERSION=$(
  "$HOST_PYTHON" -c 'import sys; print(f"python{sys.version_info.major}.{sys.version_info.minor}")'
)
export PYTHON_STDLIB=$(
  "$HOST_PYTHON" -c 'import sysconfig; print(sysconfig.get_paths()["stdlib"])'
)

mkdir -p \
  "$TOOLS_DIR/bin" \
  "$TOOLS_DIR/lib" \
  "$TOOLS_DIR/python/bin" \
  "$TOOLS_DIR/python/lib/$PYTHON_VERSION" \
  "$TOOLS_DIR/python/site-packages"
```

复制 `tmux`、Python runtime 和标准库：

```bash
install -m 755 "$HOST_TMUX" "$TOOLS_DIR/bin/tmux.real"
install -m 755 "$HOST_PYTHON" "$TOOLS_DIR/python/bin/python3"
cp -a "$PYTHON_STDLIB/." "$TOOLS_DIR/python/lib/$PYTHON_VERSION/"
rm -rf \
  "$TOOLS_DIR/python/lib/$PYTHON_VERSION/dist-packages" \
  "$TOOLS_DIR/python/lib/$PYTHON_VERSION/__pycache__"
```

把 `tmux`、Python 和 Python extension modules 依赖的动态库复制进 bundle：

```bash
{
  ldd "$HOST_TMUX"
  ldd "$HOST_PYTHON"
  find "$PYTHON_STDLIB/lib-dynload" -type f -name '*.so' -exec ldd {} \;
} | awk '
  $2 == "=>" && $3 ~ /^\// { print $3 }
  $1 ~ /^\// { print $1 }
' | sort -u | while IFS= read -r library; do
  install -m 644 "$library" "$TOOLS_DIR/lib/$(basename "$library")"
done

chmod 755 "$TOOLS_DIR/lib/ld-linux-x86-64.so.2"
```

下载并展开本次使用的 `asciinema 2.4.0` wheel：

```bash
export ASCIINEMA_WHEEL="$WORKSPACE/asciinema-2.4.0-py3-none-any.whl"
export ASCIINEMA_SHA256=249ccf108509d643ddaf38979dac48c99e9e251f597173d8553a30d7a6423104

curl --fail --location --retry 3 \
  --output "$ASCIINEMA_WHEEL" \
  https://files.pythonhosted.org/packages/55/72/d79812aa210d411f7659fde4bbb1d5ef0e80950ff70f98bfdc57e12787dc/asciinema-2.4.0-py3-none-any.whl

printf '%s  %s\n' "$ASCIINEMA_SHA256" "$ASCIINEMA_WHEEL" \
  | sha256sum -c -

"$HOST_PYTHON" -m zipfile -e \
  "$ASCIINEMA_WHEEL" \
  "$TOOLS_DIR/python/site-packages"
```

由于 task image 内的动态库版本并不统一，我们通过 bundle 自带的 dynamic loader 启动这两个工具。创建 `tmux` wrapper 并保存到 `$TOOLS_DIR/bin/tmux`：

```sh
#!/bin/sh
set -eu

bundle_root=${HARBOR_TMUX_ROOT:-/opt/harbor-tools}

exec "$bundle_root/lib/ld-linux-x86-64.so.2" \
  --library-path "$bundle_root/lib" \
  "$bundle_root/bin/tmux.real" "$@"
```

然后赋予执行权限：

```bash
chmod 755 "$TOOLS_DIR/bin/tmux"
```

创建 `asciinema` wrapper 并保存到 `$TOOLS_DIR/bin/asciinema`：

```sh
#!/bin/sh
set -eu

bundle_root=${HARBOR_TOOLS_ROOT:-/opt/harbor-tools}
export PYTHONHOME="$bundle_root/python"
export PYTHONPATH="$bundle_root/python/site-packages"

exec "$bundle_root/lib/ld-linux-x86-64.so.2" \
  --library-path "$bundle_root/lib" \
  "$bundle_root/python/bin/python3" -m asciinema "$@"
```

然后赋予执行权限：

```bash
chmod 755 "$TOOLS_DIR/bin/asciinema"
```

在宿主机先验证 bundle：

```bash
HARBOR_TMUX_ROOT="$TOOLS_DIR" "$TOOLS_DIR/bin/tmux" -V
HARBOR_TOOLS_ROOT="$TOOLS_DIR" "$TOOLS_DIR/bin/asciinema" --version
```

再选择一个已经下载的 task image，从 container 内验证：

```bash
export CANARY_IMAGE=alexgshaw/regex-chess:20251031

docker run --rm \
  --volume "$TOOLS_DIR:/opt/harbor-tools:ro" \
  --entrypoint /opt/harbor-tools/bin/tmux \
  "$CANARY_IMAGE" -V

docker run --rm \
  --volume "$TOOLS_DIR:/opt/harbor-tools:ro" \
  --entrypoint /opt/harbor-tools/bin/asciinema \
  "$CANARY_IMAGE" --version
```

**实测如果不做这一步，且网络环境不稳定，可能会出现数十个 task 在 setup 阶段即失败的情况。**

### 准备 task container 网络

部分 Terminal-Bench tasks 会在运行时访问 GitHub、Cloudflare 或软件包仓库。为了保证稳定访问，需要在 docker 内配置代理。这同样也可以通过直接修改 docker daemon 配置实现，但以下是不修改全局配置的方法，供参考。

首先在 Worker B 的 `127.0.0.1:27890` 准备一个可用的 HTTP proxy。可以直接在服务器运行代理，也可以从另一台机器通过 SSH reverse forwarding 暴露已有代理。

用 `socat` 把 loopback proxy 暴露到 Docker bridge gateway：

```bash
export DOCKER_GATEWAY=$(
  docker network inspect bridge \
    --format '{{(index .IPAM.Config 0).Gateway}}'
)
export PROXY_BRIDGE_PORT=27891
export PROXY_BRIDGE_LOG="$WORKSPACE/logs/docker-proxy-bridge.log"

tmux new-session -d -s tb21-docker-proxy-bridge \
  "exec socat -d -d \
    TCP-LISTEN:$PROXY_BRIDGE_PORT,bind=$DOCKER_GATEWAY,reuseaddr,fork \
    TCP:127.0.0.1:27890 \
    >> '$PROXY_BRIDGE_LOG' 2>&1"
```

确认 listener 已经建立：

```bash
ss -ltn | grep -F "$DOCKER_GATEWAY:$PROXY_BRIDGE_PORT"
```

最后从 task container 内发起真实请求：

```bash
docker run --rm \
  --network bridge \
  --add-host host.docker.internal:host-gateway \
  --env HTTPS_PROXY=http://host.docker.internal:27891 \
  --env https_proxy=http://host.docker.internal:27891 \
  "$CANARY_IMAGE" \
  python -c '
import urllib.request
response = urllib.request.urlopen("https://example.com/", timeout=20)
assert response.status == 200
'
```

### 为高并发任务准备 Docker network pools

Harbor 会为每个 trial 创建独立的 Docker Compose project 和 default network。Docker 的默认地址池只能提供大约 31 个较大的 network，可能无法长期承受 25-trial 并发和异常中断后残留的 networks。

如果计划运行高并发 full run，可以把一个不与本地内网冲突的地址段切成更多 `/24` network。本次实验使用：

```json
{
  "default-address-pools": [
    {
      "base": "172.18.0.0/15",
      "size": 24
    }
  ]
}
```

`172.18.0.0/15` 只是本次环境验证过的选择。应用前必须使用 `ip route` 和 `docker network inspect` 确认它不与宿主机、VPN、集群内网或已有 Docker networks 冲突。

> 修改 `/etc/docker/daemon.json` 和重启 Docker 会影响整台机器。只有在 benchmark、router 和 model-serving containers 全部停止时才能执行。

在两台机器上分别备份并修改配置：

```bash
export DAEMON_TMP=$(mktemp)

if sudo test -f /etc/docker/daemon.json; then
  sudo cp -a \
    /etc/docker/daemon.json \
    "/etc/docker/daemon.json.backup-$(date -u +%Y%m%dT%H%M%SZ)"
  sudo cat /etc/docker/daemon.json > "$DAEMON_TMP"
else
  printf '{}\n' > "$DAEMON_TMP"
fi

jq '."default-address-pools" = [
  {"base": "172.18.0.0/15", "size": 24}
]' "$DAEMON_TMP" > "$DAEMON_TMP.merged"

sudo dockerd --validate --config-file "$DAEMON_TMP.merged"
sudo install -m 0644 "$DAEMON_TMP.merged" /etc/docker/daemon.json
rm -f "$DAEMON_TMP" "$DAEMON_TMP.merged"

sudo systemctl restart docker
sudo systemctl --no-pager --full status docker
```

重启后创建一组临时 networks 用于测试，确认 Docker 能连续分配 `/24`：

```bash
for index in $(seq 1 64); do
  docker network create "tb21-pool-test-$index" >/dev/null
done

docker network inspect tb21-pool-test-1 \
  --format '{{(index .IPAM.Config 0).Subnet}}'
docker network inspect tb21-pool-test-64 \
  --format '{{(index .IPAM.Config 0).Subnet}}'

for index in $(seq 1 64); do
  docker network rm "tb21-pool-test-$index" >/dev/null
done
```

### 启动两个 SGLang workers

在 Worker A 和 Worker B 上分别启动一个 SGLang server。除了 `WORKER_IP` 以外，两台机器使用相同配置。

先在 Worker A 设置：

```bash
export WORKER_IP="$WORKER_A_IP"
export WORKER_NAME=qwen38-worker-a
```

在 Worker B 设置：

```bash
export WORKER_IP="$WORKER_B_IP"
export WORKER_NAME=qwen38-worker-b
```

然后在两台机器分别执行：

```bash
export WORKER_LOG="$WORKSPACE/logs/$WORKER_NAME.log"
mkdir -p "$WORKSPACE/logs"

tmux new-session -d -s "$WORKER_NAME" \
  "exec docker run --rm \
    --name '$WORKER_NAME' \
    --stop-timeout 30 \
    --gpus all \
    --network host \
    --ipc host \
    --ulimit memlock=-1 \
    --ulimit stack=67108864 \
    --user '$(id -u):$(id -g)' \
    --env HOME=/tmp \
    --env HF_HOME=/tmp/huggingface \
    --volume '$MODEL_PATH:/models/Qwen3.8-27B:ro' \
    '$SGLANG_IMAGE' \
    sglang serve \
      --model-path /models/Qwen3.8-27B \
      --served-model-name Qwen/Qwen3.8-27B \
      --host '$WORKER_IP' \
      --port '$WORKER_PORT' \
      --tp-size 4 \
      --dp-size 2 \
      --context-length 262144 \
      --max-running-requests 5 \
      --max-mamba-cache-size 25 \
      --mem-fraction-static 0.90 \
      --reasoning-parser qwen3 \
      --tool-call-parser qwen3_coder \
    >> '$WORKER_LOG' 2>&1"
```

这里没有传入 `--max-total-tokens`，由 SGLang 根据实际显存自动计算。

检查 server 的实际配置：

```bash
curl --fail --silent \
  "http://$WORKER_IP:$WORKER_PORT/get_server_info" \
  | jq '{
      status,
      tp_size,
      dp_size,
      context_length,
      max_running_requests,
      max_mamba_cache_size,
      mem_fraction_static,
      reasoning_parser,
      tool_call_parser,
      internal_states
    }'
```

两台 worker 都应满足：

- `tp_size = 4`；
- `dp_size = 2`；
- `context_length = 262144`；
- `max_running_requests = 5`；
- `max_mamba_cache_size = 25`；
- `mem_fraction_static = 0.9`。

### 在 Worker B 启动 SGLang router

先从 Worker B 检查两个 worker：

```bash
for endpoint in \
  "http://$WORKER_A_IP:$WORKER_PORT" \
  "http://$WORKER_B_IP:$WORKER_PORT"; do
  curl --fail --silent --max-time 10 "$endpoint/health" >/dev/null
done
```

启动 DP-aware、cache-aware router：

```bash
export ROUTER_NAME=qwen38-global-router
export ROUTER_LOG="$WORKSPACE/logs/$ROUTER_NAME.log"

tmux new-session -d -s "$ROUTER_NAME" \
  "ulimit -n 65536 && exec docker run --rm \
    --name '$ROUTER_NAME' \
    --network host \
    --ulimit nofile=65536:65536 \
    --user '$(id -u):$(id -g)' \
    --env HOME=/tmp \
    --volume '$MODEL_PATH:/models/Qwen3.8-27B:ro' \
    '$SGLANG_IMAGE' \
    python3 -m sglang_router.launch_router \
      --host 127.0.0.1 \
      --port '$ROUTER_PORT' \
      --worker-urls \
        'http://$WORKER_A_IP:$WORKER_PORT' \
        'http://$WORKER_B_IP:$WORKER_PORT' \
      --dp-aware \
      --policy cache_aware \
      --balance-abs-threshold 1 \
      --balance-rel-threshold 1.2 \
    >> '$ROUTER_LOG' 2>&1"
```

检查 router：

```bash
curl --fail --silent http://127.0.0.1:30000/health
curl --fail --silent http://127.0.0.1:30000/v1/models | jq .
```

最后发送一个真实请求：

```bash
curl --fail --silent \
  http://127.0.0.1:30000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "Qwen/Qwen3.8-27B",
    "messages": [
      {"role": "user", "content": "Reply with exactly READY."}
    ],
    "temperature": 0,
    "max_tokens": 128
  }' \
  | jq .
```

### 创建 Harbor 和 Docker Compose 配置

在 Worker B 保存以下配置到 `$WORKSPACE/tb21-full-89-agent6x.yaml`：

```yaml
n_concurrent_trials: 25
agent_timeout_multiplier: 6.0
agent_setup_timeout_multiplier: 5.0
environment:
  type: docker
  cpu_enforcement_policy: auto
  memory_enforcement_policy: auto
agents:
  - name: terminus-2
    model_name: openai/Qwen/Qwen3.8-27B
    n_concurrent: 20
    kwargs:
      api_base: http://127.0.0.1:30000/v1
      temperature: 1.0
      record_terminal_session: true
      llm_call_kwargs:
        top_p: 0.95
      model_info:
        max_input_tokens: 262144
        max_output_tokens: 65536
        input_cost_per_token: 0
        output_cost_per_token: 0
datasets:
  # `$TASK_ROOT`
  - path: /home/YOUR_USER/tb21-reproduction/terminal-bench-2-1/tasks
```

> 把上面的 dataset path 替换为 Worker B 上 `$TASK_ROOT` 的实际绝对路径。

保存以下 Docker Compose override 到 `$WORKSPACE/tb21-docker-runtime.yaml`：

```yaml
services:
  main:
    extra_hosts:
      - host.docker.internal:host-gateway
    volumes:
      - $TOOLS_DIR:/opt/harbor-tools:ro
      - $TOOLS_DIR/bin/tmux:/usr/bin/tmux:ro
      - $TOOLS_DIR/bin/asciinema:/usr/bin/asciinema:ro
    environment:
      HTTP_PROXY: http://host.docker.internal:27891
      HTTPS_PROXY: http://host.docker.internal:27891
      http_proxy: http://host.docker.internal:27891
      https_proxy: http://host.docker.internal:27891
      NO_PROXY: 127.0.0.1,localhost
      no_proxy: 127.0.0.1,localhost
```

记录两个配置文件的路径，供后续命令使用：

```bash
export HARBOR_CONFIG="$WORKSPACE/tb21-full-89-agent6x.yaml"
export DOCKER_OVERRIDE="$WORKSPACE/tb21-docker-runtime.yaml"
```

### 执行 full-run preflight

不要直接启动 89 tasks。先让 Harbor 解析最终配置，并保存解析结果：

```bash
export RESOLVED_CONFIG="$WORKSPACE/logs/tb21-agent6x-resolved-config.json"
export OPENAI_API_KEY=EMPTY

"$HARBOR_VENV/bin/harbor" run \
  --config "$HARBOR_CONFIG" \
  --extra-docker-compose "$DOCKER_OVERRIDE" \
  --print-config \
  > "$RESOLVED_CONFIG"
```

检查关键字段：

```bash
jq -e '
  .n_concurrent_trials == 25 and
  .agent_timeout_multiplier == 6 and
  .agent_setup_timeout_multiplier == 5 and
  .agents[0].name == "terminus-2" and
  .agents[0].n_concurrent == 20 and
  .agents[0].kwargs.api_base == "http://127.0.0.1:30000/v1" and
  .agents[0].kwargs.temperature == 1 and
  .agents[0].kwargs.llm_call_kwargs.top_p == 0.95 and
  .agents[0].kwargs.model_info.max_input_tokens == 262144 and
  .agents[0].kwargs.model_info.max_output_tokens == 65536 and
  .environment.type == "docker"
' "$RESOLVED_CONFIG"
```

### 启动 89-task 6× full run

创建唯一 job name、日志目录和结果目录：

```bash
export JOB_NAME="qwen38-terminus2-tb21-full89-c25-a20-agent6x-$(date +%Y%m%d-%H%M%S)"
export JOB_LOG="$WORKSPACE/logs/$JOB_NAME.log"
export JOBS_DIR="$WORKSPACE/results"
export HARBOR_SESSION=tb21-qwen-full-89-agent6x

mkdir -p "$JOBS_DIR" "$WORKSPACE/logs"
```

在持久 `tmux` session 中启动 Harbor。这里尽量不使用类似 `harbor | tee` 的 logging 形式，直接把输出重定向到文件；后续会讲解原因。

```bash
tmux new-session -d -s "$HARBOR_SESSION" \
  "cd '$WORKSPACE' && \
   ulimit -n 65536 && \
   export OPENAI_API_KEY=EMPTY && \
   exec '$HARBOR_VENV/bin/harbor' run \
     --config '$HARBOR_CONFIG' \
     --extra-docker-compose '$DOCKER_OVERRIDE' \
     --job-name '$JOB_NAME' \
     --jobs-dir '$JOBS_DIR' \
     --yes \
     >> '$JOB_LOG' 2>&1"
```

记录 Harbor PID，后续使用它执行 graceful stop：

```bash
export HARBOR_PID=$(
  tmux display-message -p -t "$HARBOR_SESSION" '#{pane_pid}'
)

printf 'job=%s\nsession=%s\npid=%s\nlog=%s\n' \
  "$JOB_NAME" "$HARBOR_SESSION" "$HARBOR_PID" "$JOB_LOG" \
  | tee "$WORKSPACE/logs/$JOB_NAME.launch.txt"
```

### 查看进度和结果

查看 Harbor 日志：

```bash
tail -n 100 -f "$JOB_LOG"
```

查看 session 是否仍在运行：

```bash
tmux has-session -t "$HARBOR_SESSION"
ps -p "$HARBOR_PID" -o pid,etime,state,args
```

Harbor 生成 `result.json` 后，可以查看整体统计：

```bash
jq '{started_at, finished_at, stats}' \
  "$JOBS_DIR/$JOB_NAME/result.json"
```

对于 reward 0、no-reward 或 error trial，不要只看总表。至少检查对应目录中的：

- `result.json`；
- `trial.log`；
- `exception_info`；
- agent trajectory；
- verifier output；
- terminal recording。

来排查是 agent 实现错误、verifier 本身 bug、还是网络等 infra 问题。

### 正确停止实验

如果必须提前停止 Harbor，向 Harbor process 发送 `SIGTERM`：

```bash
kill -TERM "$HARBOR_PID"
```

等待 Harbor 自己写入结果并清理资源：

```bash
while kill -0 "$HARBOR_PID" 2>/dev/null; do
  sleep 5
done

tail -n 100 "$JOB_LOG"
```

Benchmark 完成后，可依次停止 router、两个 workers 和 proxy bridge：

```bash
# Worker B
docker stop --time 180 qwen38-global-router
tmux kill-session -t qwen38-global-router 2>/dev/null || true

docker stop --time 30 qwen38-worker-b
tmux kill-session -t qwen38-worker-b 2>/dev/null || true

# Worker A
docker stop --time 30 qwen38-worker-a
tmux kill-session -t qwen38-worker-a 2>/dev/null || true

# Worker B proxy bridge
tmux send-keys -t tb21-docker-proxy-bridge C-c
```

## 踩坑及解决方案

最重要的 rule：**`reward = 0` 不自动等于模型能力失败**。

一个 trial 至少经过以下阶段：

1. 创建 Docker Compose project；
2. 启动 task container；
3. 安装或发现 harness tools；
4. agent 调用模型并操作 terminal；
5. verifier 安装依赖并执行测试；
6. Harbor 收集并写入 reward。

**任何一层发生网络、容器、模型 API 或 verifier timeout，都可能最终表现为 reward 0 或没有 reward。这中间可能出现的 infra 相关问题是非常多，而且随机性很强的；这导致几乎不可能出现完美运行的单次 full run。**

对异常任务（reward = 0，no-reward，各种 timeout，各种 error），我们另外检查 trajectory、`trial.log`、`exception_info` 和 verifier output，再把它归入以下类别之一：

- agent 明确实现错误；
- agent timeout，但 verifier 已生成有效 reward；
- verifier 自身执行超时；
- 已确认的 infrastructure failure；
- 证据不足，无法进一步分类。

> 在后面的 [最终结果](#最终结果) 中，我们会实际走一遍这个审计流程。

以下总结一些具体踩过的坑，其中许多在上面的复现流程中已经提到过。

### Agent overthinking 导致大量 timeout

#### 表现

在几次 3× timeout 实验中，Qwen3.8-27B 都出现了明显的 overthinking。部分任务持续生成很长的 reasoning，直到耗尽 agent timeout。极端情况下，agent 在近一小时内居然只执行了两次 tool call。

#### Timeout 调整

**把 `agent_timeout_multiplier` 从 3 提高到 6**。虽然该参数下仍有许多 task timeout，但实测该参数下的分数能稳定接近官方 report 了。

需要注意，agent timeout 和最终 reward 是两个不同维度。Agent 超时后 verifier 仍可能运行，甚至可能得到 reward 1。

`pytorch-model-recovery` 的 verifier 已经通过前四项测试，最后在安装和加载数 GB PyTorch/CUDA 依赖时耗尽 900 秒预算。Agent 已经生成 TorchScript model 并完成自测，MSE 从 `1.551031` 降到 `0.016358`。现有证据支持“实现可能已经满足最后一项测试，但 verifier 没有跑完”，因此可以在分析中单独列为可能的 infrastructure contribution。

`torch-tensor-parallelism` 的 verifier 同样在依赖下载阶段耗尽预算，甚至还没有开始执行 pytest。但 trajectory 显示实现本身缺少必要的跨-rank communication：Column Parallel 没有执行 `all_gather`，Row Parallel 没有执行 `all_reduce`。即使给 verifier 更多时间，这个实现也不应通过。

### Task containers 缺少 `tmux` 和 `asciinema`

#### 表现

Terminus-2 的许多 task container 中缺少 `tmux` 或 `asciinema`，于是尝试通过网络安装。高并发时，这些下载可能被限流或超时。Harbor 随后可能尝试从源码构建，最后在 agent 真正开始工作前就耗尽 setup timeout，环境检查发现缺少工具，最终导致 trial 失败。

#### 工具注入

在宿主机提前准备包含 dynamic loader、依赖库、`tmux` 和 `asciinema` 的只读 bundle，再通过 Harbor 的 `--extra-docker-compose` 注入每个 task container：

```yaml
services:
  main:
    volumes:
      - /path/to/harbor-tools-amd64:/opt/harbor-tools:ro
      - /path/to/harbor-tools-amd64/bin/tmux:/usr/bin/tmux:ro
      - /path/to/harbor-tools-amd64/bin/asciinema:/usr/bin/asciinema:ro
```

具体流程见 [为 task containers 准备 `tmux` 和 `asciinema`](#为-task-containers-准备-tmux-和-asciinema) 一节。这样 Harbor 能直接检测到工具，不再为每个 trial 重复下载。

### Docker network 地址池耗尽

#### 表现

高并发运行时，Docker 报错：

```text
all predefined address pools have been fully subnetted
```

#### 根因

Harbor 为每个 trial 创建独立的 Docker Compose project。Compose 通常也会创建独立的 default network。Docker 默认大约只有 31 个候选地址池：

- `172.17.0.0/16` 到 `172.31.0.0/16`；
- 从 `192.168.0.0/16` 划出的若干 `/20`。

当 Harbor 或 task container 被强制终止/异常退出时，残留 network 还会继续占用这些地址池。

#### 地址池扩容

具体方法见 [为高并发任务准备 Docker network pools](#为高并发任务准备-docker-network-pools) 一节。

### 使用 Ctrl-C 中断 `harbor | tee` 后残留资源

#### 表现

一次实验通过以下形式运行：

```bash
harbor run ... | tee run.log
```

在终端按 Ctrl-C 后，Harbor 没有正常结束，也没有完整标记或清理仍在运行的 task containers。

#### 可能原因

SIGINT 同时到达 Harbor 和 `tee`。`tee` 先退出后，Harbor 继续写 stdout 时遇到已经关闭的 pipe，最终以 `BrokenPipeError` 异常结束，而不是完成自己的 graceful shutdown 流程。

#### 安全停止方法

运行时避免把 Harbor 放在 pipe 左侧。让它成为 tmux pane 的最终 process，并直接重定向日志：

```bash
exec harbor run ... >> run.log 2>&1
```

需要停止时，向 Harbor PID 发送 `SIGTERM`（**这是官方给出的 graceful shutdown 方法**）：

```bash
kill -TERM HARBOR_PID
```

然后等待 Harbor 自己退出，这样才能保证它自动保存结果以待 resume，正确清理 task containers、Docker Compose project 和 networks。

### TB 2.1 agent 和 verifier 共用评测环境，且清理后无法重新运行 verifier

#### 表现

TB 2.1 agent 和 verifier 共用评测环境，且不保存任何 agent 产生的任务 artifacts，这导致不能直接对于 verifier 阶段出现 infra 影响导致错误的任务进行重试。

#### 解决方案

由于 TB 2.1 本身限制，没有特别好的解决方案，可以尝试：

- 从原始 trajectory 或保存的 asciinema 终端录屏尝试评估 infra 问题的影响程度和 agent solution 的正确性
- 对发生明显 infra 影响的任务进行单独重跑

### `build-pov-ray` 因 Cloudflare 403 无法下载源码

#### 表现

`build-pov-ray` 因 `povray.org` 的 Cloudflare 403 无法下载源码（[Issue #76](https://github.com/harbor-framework/terminal-bench-2/issues/76)）；对应修复已提交但尚未合并（[PR #77](https://github.com/harbor-framework/terminal-bench-2/pull/77)）。

#### 解决方案

计分时不考虑该任务，或直接根据 agent 轨迹判断是否 pass。

### Oracle 验证环境中的额外坑

跑 oracle 验证环境时，除一系列网络问题导致的 reward=0 之外，另有两个任务 oracle solution 有实现错误，但任务本身能够完成，verifier 实现也没有问题。细节如下：

- `build-cython-ext`：Oracle solution 未锁定依赖 `planarity` 版本，其升级至 1.0.0 后与 pyknotid 0.5.3 不兼容，导致 Oracle reward = 0；对应 [Issue #75](https://github.com/harbor-framework/terminal-bench-2/issues/75) 和 [PR #73](https://github.com/harbor-framework/terminal-bench-2/pull/73)。
- `mcmc-sampling-stan`：Oracle solution 未锁定 `RcppParallel`，当前 6.x 版本新增 CMake 依赖，而任务镜像未安装 CMake，导致 RStan 安装失败；对应 [Issue #74](https://github.com/harbor-framework/terminal-bench-2/issues/74) 和 [PR #73](https://github.com/harbor-framework/terminal-bench-2/pull/73)。

#### 解决方案

不影响最终结果，无需解决。

## 最终结果

### 运行信息

```text
job name:      qwen38-terminus2-tb21-full89-c25-a20-agent6x-20260830-234431
started at:    2026-08-30 23:44:31 (UTC+8)
finished at:   2026-08-31 07:08:03 (UTC+8)
duration:      about 7 h 23 min
completed:     89/89
reward = 1:    61
reward = 0:    24
no reward:     4
final score:   68.54
errored:       16
input tokens:  118,199,621
output tokens: 8,269,356
```

### Error 分类

共记录 16 个 error，其中 13 个为 `AgentTimeoutError`，2 个为 `VerifierTimeoutError`，1 个为 `RuntimeError`。进一步检查所有失败任务后，发现除 error 外，还有部分 reward 0 任务受到一次网络中断问题影响，以下是完整 audit：

- 两个 `VerifierTimeoutError` 需要分别讨论：
  - `pytorch-model-recovery` 官方 verifier 的前四项测试已通过；超时发生在最后的测试期间。由于 900 秒预算还包含 apt、uv 以及数 GB PyTorch/CUDA 依赖的下载和安装，verifier 因此 timeout。检查 trajectory 和模型输出 artifacts 后发现 agent 已生成 TorchScript 模型并完成自测：原始 MSE 为 1.551031，调优后降至 0.016358，应当能够通过 verifier 的最后一个 loss test。**故该 task 应被计为 passed**。
  - `torch-tensor-parallelism` 的 verifier 在依赖下载阶段耗尽预算，尚未开始 pytest，但进一步检查发现 agent 实现缺少必要的跨 rank 通信：Column Parallel 未执行 all_gather，Row Parallel 未执行 all_reduce。**模型实现错误，应计为 failed**。
- 一个 `RuntimeError` 为 agent 执行任务过程中执行了 `tmux kill-server`，分配给 agent 执行任务的 agent pane 直接消失，Harbor 检测到后抛出 runtime error。**0/1 个任务应计为 passed**。
- 对于 reward = 0 的 24 个任务，经过完整审计，有以下任务出现 infra 相关严重错误。

  - Agent 阶段正常完成，只是 verifier 出现 infra 问题，检查 Agent 轨迹能明显证明原 task 成功的：

    | Task | 基础设施问题 | 结果判断 |
    | --- | --- | --- |
    | `prove-plus-comm` | verifier 安装依赖时，代理持续返回 HTTP 502，测试没有真正运行 | Agent 的 Coq 证明已经通过 `coqc`；应当判为 passed |
    | `tune-mjcf` | verifier 因代理 502 无法安装 `curl`/`uvx`，测试未运行 | Agent 自测状态一致、约 1.92× 加速；应当判为 passed |

  - Agent 阶段即出现 infra 问题的，进行了小范围重跑，结果如下：

    | Task | 原始基础设施问题 | 重跑结果 |
    | --- | --- | --- |
    | `build-pov-ray` | 获取历史 POV-Ray 2.2 源码时，访问 Wayback Machine 超时：`curl (28)`，30 秒内返回 0 bytes。源码获取路径受到网络问题影响 | **reward = 0，failed**。**这个任务是上面提到的 Cloudflare 访问 issue，按理来说应算作 invalid task；查看 agent 轨迹后发现 agent 任务实际成功了（从另外一个源下载了源码，只是文件使用 CRLF 而非 LF 且大小写不一致，这导致了 verifier 判断为 failed）** |
    | `make-doom-for-mips` | Docker 代理 `172.18.0.1:27891` 在安装 MIPS 交叉编译工具链时反复返回 HTTP 502；日志中有大量 `Failed to fetch`。原运行最终在 5,400 秒达到 Agent timeout | **reward = 0，AgentTimeoutError**。重跑未再出现代理 502，但仍在 5,400 秒超时。Verifier 0/3：`vm.js` 没有生成 `/tmp/frame.bmp`，执行、文件存在性和图像相似度检查全部失败 |
    | `dna-assembly` | 原任务容器缺少 CA trust store，HTTPS 请求先出现 `CERTIFICATE_VERIFY_FAILED`，后续经代理下载又出现 `SSL: UNEXPECTED_EOF_WHILE_READING`，依赖获取不稳定。原运行最终在 10,800 秒超时 | **reward = 0，AgentTimeoutError**。重跑未出现相同代理/TLS 故障，但仍在 10,800 秒超时。Verifier 0/1：要求的 `/app/primers.fasta` 没有生成 |

### 结果解释

**总结：原始分数为 61/89（68.54%），修正 infra 问题导致的 false negative 后，若排除任务本身有问题的 `build-pov-ray`，结果为 64/88（72.73%）；若不排除 `build-pov-ray` 并将其计为成功，结果为 65/89（73.03%）。Qwen [官方 model card](https://huggingface.co/Qwen/Qwen3.8-27B-FP8) 报告的结果为 73.0%，可以认为基本一致。**

这个结果潜在的 issue：1）大量的 task 准备阶段、agent 阶段和 verifier 阶段需要网络，网络不稳定。虽然通过全面的审计和小范围重跑解决了大部分，但仍可能留有 edge case。2）TB 2.1 任务定义没有使用分开的 agent container 和 verifier container，可能导致环境污染，且无法进行 verifier regrade 来修复偶发的 infra 问题。3）模型本身局限性导致大量 overthinking，不得不大幅提高 agent timeout multiplier，且即使在 6× 下仍有 10+ 任务 timeout。Qwen 官方跑 TB 时使用的 timeout 没有发布。
