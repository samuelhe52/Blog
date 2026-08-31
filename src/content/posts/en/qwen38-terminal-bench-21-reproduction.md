---
title: "Reproducing Qwen3.8-27B's Terminal-Bench 2.1 Results: Setup, Full Run, and Pitfalls"
description: "A complete reproduction of Qwen3.8-27B on Terminal-Bench 2.1 using SGLang, Harbor 0.21.0, and Terminus-2 across 16 A100 40GB GPUs, including setup, debugging, and result auditing."
date: 2026-09-01
lang: "en"
translationSlug: "qwen38-terminal-bench-21-reproduction"
author: "konakona"
---

<!-- markdownlint-disable MD013 MD024 -->

This post documents our complete process for reproducing the Qwen3.8-27B Terminal-Bench 2.1 result on 16 A100 40GB GPUs using SGLang, Harbor 0.21.0, and Terminus-2. **In practice, running the benchmark itself was not what took the most time. The real time sink was having to run it many extra times while debugging, just to catch all kinds of edge cases and eventually arrive at a reasonably trustworthy result. This post aims to help readers avoid those pitfalls.**

> The procedures and pitfalls described here are time-sensitive and are provided only as a reference. The experiments were completed between August 29 and August 31.

This post has four parts:

1. The experimental environment and how the components fit together;
2. A complete manual, from environment setup to launching the 89-task full run;
3. The problems we encountered, how we diagnosed them, and how we resolved them;
4. Results under the final config.

## Environment overview

### Benchmark and harness

| Component        | Configuration                              |
| ---------------- | ------------------------------------------ |
| Model            | `Qwen/Qwen3.8-27B`, BF16                   |
| Inference backend | SGLang Docker runtime                     |
| Benchmark        | Terminal-Bench 2.1, 89 tasks               |
| Benchmark commit | `7131e4375048a0e408a8fb404b5f499d726b695b` |
| Runner           | Harbor 0.21.0                              |
| Agent harness    | Terminus-2                                 |
| Sandbox runtime  | Docker + Docker Compose                    |

Terminal-Bench 2.1, referred to as TB below, defines its tasks in Harbor's format and relies on Harbor for execution. For each trial, Harbor launches an independent task container, runs Terminus-2 inside it, records the terminal session, and finally runs the verifier bundled with the task. **One important detail is that TB uses a shared container: the task container and verifier share the same runtime environment. We will see later why this creates problems.**

### Hardware and service topology

The final experiment used two AMD64 Linux servers, each with eight A100-SXM4-40GB GPUs:

| Node     |          GPU | SGLang config | Role                                |
| -------- | -----------: | ------------- | ----------------------------------- |
| Worker A | 8× A100 40GB | TP=4, DP=2    | Serves two inference replicas       |
| Worker B | 8× A100 40GB | TP=4, DP=2    | Two replicas; runs router and Harbor |

Both workers serve the SGLang router over the private network. Harbor talks only to the router; it does not select a specific inference replica directly:

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

### Final 6× run parameters

The final experiment used the following serving and sampling config:

| Parameter                      |                         Value |
| ------------------------------ | ----------------------------: |
| GPU                            |         16× A100-SXM4-40GB    |
| TP × DP                        |          4 × 2 per machine    |
| Inference replicas             |                             4 |
| Context length                 |                        262144 |
| Maximum input tokens           |                        262144 |
| Maximum output tokens          |                         65536 |
| Maximum total tokens           | Automatically set by SGLang  |
| Maximum running requests       | 5 per replica, 20 in total    |
| Maximum Mamba cache size       |                25 per replica |
| `mem_fraction_static`          |                          0.90 |
| Reasoning parser               |                       `qwen3` |
| Tool-call parser               |                 `qwen3_coder` |
| Temperature                    |                           1.0 |
| `top_p`                        |                          0.95 |
| `top_k`                        |                       Not set |
| Harbor trial concurrency       |                            25 |
| Terminus agent concurrency     |                            20 |
| Agent timeout multiplier       |                             6 |
| Agent setup timeout multiplier |                             5 |

### Prerequisites

Verify that both servers meet the following requirements:

- AMD64 Linux;
- Docker and NVIDIA Container Toolkit are installed correctly;
- The current user can run GPU-enabled Docker containers;
- The two machines have private IP addresses that can reach each other;
- The BF16 checkpoint is already present on local disk on both machines;
- The SGLang runtime image is available as a Docker image or tar archive;
- Worker B has enough space for the 89 Terminal-Bench task images and run artifacts;
- Long-running processes use `tmux` and persistent logs instead of depending on an SSH session staying alive.

The commands below use these variables to represent the local environment. Replace the addresses and paths before running them:

```bash
export WORKSPACE=/home/YOUR_USER/tb21-reproduction
export MODEL_PATH="$WORKSPACE/models/Qwen3.8-27B"
export SGLANG_IMAGE=lmsysorg/sglang:latest-runtime

export WORKER_A_IP=10.0.0.11
export WORKER_B_IP=10.0.0.12
export WORKER_PORT=30001
export ROUTER_PORT=30000
```

`WORKER_A_IP` and `WORKER_B_IP` must be private addresses that the two servers can use to reach each other directly.

## Reproduction manual

> The complete reproduction procedure below is fairly long. You can skip to [Pitfalls and solutions](#pitfalls-and-solutions) if you only want the troubleshooting notes.

This section includes only the final path we used. Each launch step is followed by a corresponding validation command so that problems surface as early as possible.

### Install the basic tools

Install the required packages on both machines. For example, on Ubuntu:

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

### Prepare the SGLang image and model

Pull the SGLang image on both machines:

```bash
docker pull "$SGLANG_IMAGE"
docker image inspect "$SGLANG_IMAGE" \
  --format 'id={{.Id}} architecture={{.Architecture}} created={{.Created}}'
```

If `docker pull` needs a proxy, configure it in the Docker daemon. Alternatively, use `skopeo copy`, which recognizes proxy vars directly, to download an image archive first, then run `docker load` on both machines.

### Install Harbor 0.21.0 on Worker B

Run the following steps only on Worker B, where Harbor will run.

First, create the directories:

```bash
mkdir -p \
  "$WORKSPACE/bin" \
  "$WORKSPACE/logs" \
  "$WORKSPACE/results"

export UV_INSTALL_DIR="$WORKSPACE/bin"
export PATH="$UV_INSTALL_DIR:$PATH"
```

Install `uv` and Python 3.13:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install 3.13
```

Download the Harbor 0.21.0 wheel and verify the exact file used in this experiment:

```bash
export HARBOR_WHEEL="$WORKSPACE/harbor-0.21.0-py3-none-any.whl"
export HARBOR_WHEEL_SHA256=c77d779a03f1a9e8ecb3c449e17f39a9728b82238832f1fd28632eb9426c0a21

wheel_url=$(curl -fsSL https://pypi.org/pypi/harbor/0.21.0/json \
  | jq -r '.urls[] | select(.filename == "harbor-0.21.0-py3-none-any.whl") | .url')

curl -fsSL "$wheel_url" -o "$HARBOR_WHEEL"
printf '%s  %s\n' "$HARBOR_WHEEL_SHA256" "$HARBOR_WHEEL" \
  | sha256sum -c -
```

Create an isolated environment and install Harbor:

```bash
export HARBOR_VENV="$WORKSPACE/.venv-harbor-0.21.0"

uv venv --python 3.13 "$HARBOR_VENV"
uv pip install --python "$HARBOR_VENV/bin/python" "$HARBOR_WHEEL"
uv pip freeze --python "$HARBOR_VENV/bin/python" \
  > "$WORKSPACE/logs/harbor-0.21.0-freeze.txt"

"$HARBOR_VENV/bin/python" --version
"$HARBOR_VENV/bin/harbor" --version
```

### Download and pin Terminal-Bench 2.1

Clone the task repository and pin it to the commit used in this experiment:

```bash
export TB21_ROOT="$WORKSPACE/terminal-bench-2-1"
export TASK_ROOT="$TB21_ROOT/tasks"

git clone \
  https://github.com/harbor-framework/terminal-bench-2-1.git \
  "$TB21_ROOT"

git -C "$TB21_ROOT" checkout --detach \
  7131e4375048a0e408a8fb404b5f499d726b695b
```

Verify the task count:

```bash
find "$TASK_ROOT" -mindepth 2 -maxdepth 2 -name task.toml -type f \
  | wc -l
```

The expected result is `89`.

### Pull the 89 task images

First, extract and deduplicate the Docker images from each task's `task.toml`:

```bash
export IMAGE_MANIFEST="$WORKSPACE/images-amd64.txt"

find "$TASK_ROOT" -name task.toml -type f -print0 \
  | xargs -0 awk -F ' = ' \
      '$1 == "docker_image" {gsub(/"/, "", $2); print $2}' \
  | sort -u \
  > "$IMAGE_MANIFEST"

wc -l "$IMAGE_MANIFEST"
```

For easier proxy use, we downloaded AMD64 image archives with `skopeo` and then imported them explicitly into Docker.

> If your network is reliable, you can also use `docker pull` to pull the images in batches.

Create a temporary directory:

```bash
export IMAGE_SCRATCH="$WORKSPACE/image-downloads"
mkdir -p "$IMAGE_SCRATCH"
```

Download each image and verify its architecture:

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

Finally, count the images that are ready:

```bash
ready=0
while IFS= read -r image; do
  if docker image inspect "$image" >/dev/null 2>&1; then
    ready=$((ready + 1))
  fi
done < "$IMAGE_MANIFEST"

printf '%s/89 images ready\n' "$ready"
```

### Prepare `tmux` and `asciinema` for the task containers

Terminus-2 needs `tmux` and `asciinema` inside the task containers. **Some task images do not include these tools. If Harbor has to download them inside every container, network instability or concurrent rate limits can cause setup timeouts.**

Our solution was to prepare a mountable AMD64 tool bundle on the host and map it into `/usr/bin` in every task container.

The following commands use the host's `tmux` and Python runtime. First, identify the Python version and standard library location:

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

Copy `tmux`, the Python runtime, and the standard library:

```bash
install -m 755 "$HOST_TMUX" "$TOOLS_DIR/bin/tmux.real"
install -m 755 "$HOST_PYTHON" "$TOOLS_DIR/python/bin/python3"
cp -a "$PYTHON_STDLIB/." "$TOOLS_DIR/python/lib/$PYTHON_VERSION/"
rm -rf \
  "$TOOLS_DIR/python/lib/$PYTHON_VERSION/dist-packages" \
  "$TOOLS_DIR/python/lib/$PYTHON_VERSION/__pycache__"
```

Copy the dynamic libraries required by `tmux`, Python, and Python extension modules into the bundle:

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

Download and unpack the `asciinema 2.4.0` wheel used in this experiment:

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

Because the task images do not all use the same dynamic-library versions, we launch both tools through the dynamic loader included in the bundle. Create a `tmux` wrapper at `$TOOLS_DIR/bin/tmux`:

```sh
#!/bin/sh
set -eu

bundle_root=${HARBOR_TMUX_ROOT:-/opt/harbor-tools}

exec "$bundle_root/lib/ld-linux-x86-64.so.2" \
  --library-path "$bundle_root/lib" \
  "$bundle_root/bin/tmux.real" "$@"
```

Then make it executable:

```bash
chmod 755 "$TOOLS_DIR/bin/tmux"
```

Create an `asciinema` wrapper at `$TOOLS_DIR/bin/asciinema`:

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

Then make it executable:

```bash
chmod 755 "$TOOLS_DIR/bin/asciinema"
```

Validate the bundle on the host first:

```bash
HARBOR_TMUX_ROOT="$TOOLS_DIR" "$TOOLS_DIR/bin/tmux" -V
HARBOR_TOOLS_ROOT="$TOOLS_DIR" "$TOOLS_DIR/bin/asciinema" --version
```

Then select one task image that has already been downloaded and validate the tools inside the container:

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

**In our testing, skipping this step in an unstable network environment could cause dozens of tasks to fail during setup before the agent even started.**

### Prepare task-container networking

Some Terminal-Bench tasks access GitHub, Cloudflare, or package repositories at runtime. To make that access reliable, configure a proxy inside Docker. You can also do this by changing the Docker daemon config directly, but the following approach avoids global changes.

First, make a working HTTP proxy available at `127.0.0.1:27890` on Worker B. You can run the proxy directly on the server, or expose an existing proxy from another machine through SSH reverse forwarding.

Use `socat` to expose the loopback proxy on the Docker bridge gateway:

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

Verify that the listener is active:

```bash
ss -ltn | grep -F "$DOCKER_GATEWAY:$PROXY_BRIDGE_PORT"
```

Finally, make a real request from inside a task container:

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

### Prepare Docker network pools for high-concurrency runs

Harbor creates a separate Docker Compose project and default network for every trial. Docker's default address pools provide only about 31 relatively large networks, which might not be enough for 25 concurrent trials plus networks left behind after abnormal interruptions.

If you plan to run the full benchmark at high concurrency, you can divide a subnet that does not conflict with the local private network into more `/24` networks. We used:

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

`172.18.0.0/15` was only a choice validated in our environment. Before applying it, use `ip route` and `docker network inspect` to verify that it does not overlap with any host, VPN, cluster, or existing Docker network.

> Changing `/etc/docker/daemon.json` and restarting Docker affects the entire machine. Do this only when the benchmark, router, and model-serving containers have all stopped.

Back up and update the config on both machines:

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

After the restart, create a set of temporary networks to verify that Docker can allocate `/24` networks continuously:

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

### Launch the two SGLang workers

Launch one SGLang server on Worker A and one on Worker B. The two machines use the same config except for `WORKER_IP`.

On Worker A, set:

```bash
export WORKER_IP="$WORKER_A_IP"
export WORKER_NAME=qwen38-worker-a
```

On Worker B, set:

```bash
export WORKER_IP="$WORKER_B_IP"
export WORKER_NAME=qwen38-worker-b
```

Then run the following on both machines:

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

We do not pass `--max-total-tokens` here. SGLang calculates it automatically from the available GPU memory.

Check the server's effective config:

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

Both workers should report:

- `tp_size = 4`;
- `dp_size = 2`;
- `context_length = 262144`;
- `max_running_requests = 5`;
- `max_mamba_cache_size = 25`;
- `mem_fraction_static = 0.9`.

### Launch the SGLang router on Worker B

First, check both workers from Worker B:

```bash
for endpoint in \
  "http://$WORKER_A_IP:$WORKER_PORT" \
  "http://$WORKER_B_IP:$WORKER_PORT"; do
  curl --fail --silent --max-time 10 "$endpoint/health" >/dev/null
done
```

Launch a DP-aware, cache-aware router:

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

Check the router:

```bash
curl --fail --silent http://127.0.0.1:30000/health
curl --fail --silent http://127.0.0.1:30000/v1/models | jq .
```

Finally, send a real request:

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

### Create the Harbor and Docker Compose configs

On Worker B, save the following config to `$WORKSPACE/tb21-full-89-agent6x.yaml`:

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

> Replace the dataset path above with the actual absolute path of `$TASK_ROOT` on Worker B.

Save the following Docker Compose override to `$WORKSPACE/tb21-docker-runtime.yaml`:

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

Record the paths to both config files for the commands that follow:

```bash
export HARBOR_CONFIG="$WORKSPACE/tb21-full-89-agent6x.yaml"
export DOCKER_OVERRIDE="$WORKSPACE/tb21-docker-runtime.yaml"
```

### Run the full-run preflight

Do not launch all 89 tasks immediately. First, have Harbor resolve the final config and save the result:

```bash
export RESOLVED_CONFIG="$WORKSPACE/logs/tb21-agent6x-resolved-config.json"
export OPENAI_API_KEY=EMPTY

"$HARBOR_VENV/bin/harbor" run \
  --config "$HARBOR_CONFIG" \
  --extra-docker-compose "$DOCKER_OVERRIDE" \
  --print-config \
  > "$RESOLVED_CONFIG"
```

Check the key fields:

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

### Launch the 89-task 6× full run

Create a unique job name, log path, and results directory:

```bash
export JOB_NAME="qwen38-terminus2-tb21-full89-c25-a20-agent6x-$(date +%Y%m%d-%H%M%S)"
export JOB_LOG="$WORKSPACE/logs/$JOB_NAME.log"
export JOBS_DIR="$WORKSPACE/results"
export HARBOR_SESSION=tb21-qwen-full-89-agent6x

mkdir -p "$JOBS_DIR" "$WORKSPACE/logs"
```

Launch Harbor in a persistent `tmux` session. Avoid logging through a pipeline such as `harbor | tee`; redirect output directly to a file instead. The reason is explained later.

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

Record the Harbor PID so you can stop it gracefully later:

```bash
export HARBOR_PID=$(
  tmux display-message -p -t "$HARBOR_SESSION" '#{pane_pid}'
)

printf 'job=%s\nsession=%s\npid=%s\nlog=%s\n' \
  "$JOB_NAME" "$HARBOR_SESSION" "$HARBOR_PID" "$JOB_LOG" \
  | tee "$WORKSPACE/logs/$JOB_NAME.launch.txt"
```

### Monitor progress and inspect results

Follow the Harbor log:

```bash
tail -n 100 -f "$JOB_LOG"
```

Check whether the session is still running:

```bash
tmux has-session -t "$HARBOR_SESSION"
ps -p "$HARBOR_PID" -o pid,etime,state,args
```

After Harbor creates `result.json`, inspect the overall statistics:

```bash
jq '{started_at, finished_at, stats}' \
  "$JOBS_DIR/$JOB_NAME/result.json"
```

For reward 0, no-reward, or error trials, do not rely on the aggregate table alone. At a minimum, inspect the following in each corresponding trial directory:

- `result.json`;
- `trial.log`;
- `exception_info`;
- the agent trajectory;
- verifier output;
- the terminal recording.

Use this evidence to determine whether the failure came from the agent implementation, a bug in the verifier itself, or an infra issue such as the network.

### Stop the experiment correctly

If you must stop Harbor early, send `SIGTERM` to the Harbor process:

```bash
kill -TERM "$HARBOR_PID"
```

Wait for Harbor to write its results and clean up its resources:

```bash
while kill -0 "$HARBOR_PID" 2>/dev/null; do
  sleep 5
done

tail -n 100 "$JOB_LOG"
```

After the benchmark finishes, stop the router, both workers, and the proxy bridge in order:

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

## Pitfalls and solutions

The most important rule is: **`reward = 0` does not automatically mean a model capability failure.**

A trial passes through at least the following stages:

1. Create the Docker Compose project;
2. Start the task container;
3. Install or locate the harness tools;
4. Have the agent call the model and operate the terminal;
5. Install verifier dependencies and run the tests;
6. Have Harbor collect and write the reward.

**A network, container, model API, or verifier timeout at any layer can ultimately appear as reward 0 or no reward. The number of possible infra-related failures in this pipeline is very large, and their randomness makes a perfect single full run almost impossible.**

For anomalous tasks—reward = 0, no-reward, any timeout, or any error—we separately inspected the trajectory, `trial.log`, `exception_info`, and verifier output, then assigned the trial to one of the following categories:

- A clear agent implementation error;
- Agent timeout, but the verifier still produced a valid reward;
- A timeout in the verifier itself;
- A confirmed infrastructure failure;
- Insufficient evidence for further classification.

> In [Final results](#final-results), we walk through this audit process with the actual run.

The sections below summarize some of the specific pitfalls we encountered. Many of them have already appeared in the reproduction procedure above.

### Task containers missing `tmux` and `asciinema`

#### Symptom

Many Terminus-2 task containers were missing `tmux` or `asciinema`, so the harness tried to install them over the network. At high concurrency, those downloads could be rate-limited or time out. Harbor might then try to build the tools from source, eventually exhausting the setup timeout before the agent actually began working. The environment check would still report missing tools, and the trial would fail.

#### Tool injection

Prepare a read-only bundle on the host containing the dynamic loader, dependent libraries, `tmux`, and `asciinema`, then inject it into every task container through Harbor's `--extra-docker-compose`:

```yaml
services:
  main:
    volumes:
      - /path/to/harbor-tools-amd64:/opt/harbor-tools:ro
      - /path/to/harbor-tools-amd64/bin/tmux:/usr/bin/tmux:ro
      - /path/to/harbor-tools-amd64/bin/asciinema:/usr/bin/asciinema:ro
```

See [Prepare `tmux` and `asciinema` for the task containers](#prepare-tmux-and-asciinema-for-the-task-containers) for the full procedure. This lets Harbor detect the tools directly instead of downloading them again for every trial.

### Docker network address-pool exhaustion

#### Symptom

At high concurrency, Docker reported:

```text
all predefined address pools have been fully subnetted
```

#### Root cause

Harbor creates a separate Docker Compose project for every trial. Compose normally creates a separate default network as well. By default, Docker has only about 31 candidate address pools:

- `172.17.0.0/16` through `172.31.0.0/16`;
- Several `/20` networks carved out of `192.168.0.0/16`.

If Harbor or a task container is forcefully terminated or exits abnormally, leftover networks continue occupying those address pools.

#### Expand the address pool

See [Prepare Docker network pools for high-concurrency runs](#prepare-docker-network-pools-for-high-concurrency-runs) for the exact procedure.

### Resources left behind after interrupting `harbor | tee` with Ctrl-C

#### Symptom

One experiment was launched like this:

```bash
harbor run ... | tee run.log
```

After Ctrl-C was pressed in the terminal, Harbor did not shut down cleanly and did not fully mark or clean up the task containers that were still running.

#### Likely cause

SIGINT reached both Harbor and `tee`. After `tee` exited first, Harbor tried to keep writing to stdout, encountered a closed pipe, and terminated with a `BrokenPipeError` instead of completing its own graceful shutdown process.

#### Safe shutdown

Do not put Harbor on the left side of a pipe. Make it the final process in the tmux pane and redirect its logs directly:

```bash
exec harbor run ... >> run.log 2>&1
```

To stop it, send `SIGTERM` to the Harbor PID (**this is Harbor's documented graceful-shutdown method**):

```bash
kill -TERM HARBOR_PID
```

Then wait for Harbor to exit on its own. This lets it save results for a later resume and properly clean up task containers, Docker Compose projects, and networks.

### Agent overthinking caused many timeouts

#### Symptom

Across several experiments with a 3× timeout, Qwen3.8-27B showed obvious overthinking. Some tasks kept generating long reasoning traces until the agent timeout expired. In an extreme case, the agent made only two tool calls in almost an hour.

#### Timeout adjustment

We increased `agent_timeout_multiplier` from 3 to 6. Many tasks still timed out, but the score under this setting was consistently close to the official report in our testing.

Note that agent timeout and final reward are two separate dimensions. The verifier may still run after an agent timeout and can even return reward 1.

For `pytorch-model-recovery`, the verifier passed the first four tests, then exhausted its 900-second budget while installing and loading several GB of PyTorch/CUDA dependencies for the last test. The agent had already produced a TorchScript model and completed its own test, reducing MSE from `1.551031` to `0.016358`. The available evidence supports the conclusion that the implementation might already have satisfied the final test, but the verifier did not finish. It can therefore be listed separately in the analysis as a possible infrastructure contribution.

The verifier for `torch-tensor-parallelism` also exhausted its budget during dependency downloads, before pytest even started. However, the trajectory showed that the implementation itself lacked the required cross-rank communication: Column Parallel did not perform `all_gather`, and Row Parallel did not perform `all_reduce`. Even with more verifier time, this implementation should not pass.

### TB 2.1 shares the evaluation environment between the agent and verifier, and the verifier cannot be rerun after cleanup

#### Symptom

In TB 2.1, the agent and verifier share the same evaluation environment, and no task artifacts produced by the agent are preserved. This means a task cannot simply be retried when an infra issue affects the verifier stage.

#### Workarounds

Because this is a limitation of TB 2.1 itself, there is no particularly good solution. You can try to:

- Estimate the impact of the infra issue and the correctness of the agent solution from the original trajectory or saved asciinema terminal recording;
- Rerun individual tasks that show clear infra impact.

### `build-pov-ray` could not download source code because of Cloudflare 403

#### Symptom

`build-pov-ray` could not download its source code because `povray.org` returned Cloudflare 403 ([Issue #76](https://github.com/harbor-framework/terminal-bench-2/issues/76)). A fix was submitted but had not yet been merged ([PR #77](https://github.com/harbor-framework/terminal-bench-2/pull/77)).

#### Workarounds

Exclude this task when calculating the score, or determine whether it passes directly from the agent trajectory.

### Additional pitfalls in the Oracle validation environment

When we ran the Oracle validation environment, a series of network problems produced reward=0. Separately, two tasks contained implementation errors in their Oracle solutions, even though the tasks themselves were completable and their verifiers were sound:

- `build-cython-ext`: The Oracle solution did not pin the `planarity` dependency. After it was upgraded to 1.0.0, it became incompatible with pyknotid 0.5.3, producing Oracle reward = 0. See [Issue #75](https://github.com/harbor-framework/terminal-bench-2/issues/75) and [PR #73](https://github.com/harbor-framework/terminal-bench-2/pull/73).
- `mcmc-sampling-stan`: The Oracle solution did not pin `RcppParallel`. The current 6.x version added a CMake dependency, but the task image did not include CMake, so the RStan installation failed. See [Issue #74](https://github.com/harbor-framework/terminal-bench-2/issues/74) and [PR #73](https://github.com/harbor-framework/terminal-bench-2/pull/73).

#### Resolution

This does not affect the final result, so no action is needed.

## Final results

### Run information

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

### Error classification

The run recorded 16 errors: 13 `AgentTimeoutError`, two `VerifierTimeoutError`, and one `RuntimeError`. After inspecting every failed task, we also found that a network outage had affected some reward 0 tasks that were not included in the error count. The complete audit follows:

- The two `VerifierTimeoutError` cases need to be considered separately:
  - The official verifier for `pytorch-model-recovery` passed the first four tests and timed out during the last one. Its 900-second budget also included downloading and installing apt and uv packages plus several GB of PyTorch/CUDA dependencies. Inspection of the trajectory and model-output artifacts showed that the agent had produced a TorchScript model and completed its own test: the original MSE was 1.551031, and tuning reduced it to 0.016358. It should be able to pass the verifier's final loss test. **This task should therefore be counted as passed.**
  - The verifier for `torch-tensor-parallelism` exhausted its budget during dependency downloads before pytest began. Further inspection showed that the agent implementation lacked the required cross-rank communication: Column Parallel did not perform `all_gather`, and Row Parallel did not perform `all_reduce`. **The model implementation was incorrect and should be counted as failed.**
- The single `RuntimeError` occurred because the agent ran `tmux kill-server` while executing the task. The agent pane assigned to the task disappeared, and Harbor raised a runtime error when it detected that. **0/1 tasks should be counted as passed.**
- A full audit of the 24 reward = 0 tasks found the following cases with severe infra-related errors.

  - The agent stage completed normally, but the verifier encountered an infra issue. Inspection of the agent trajectory clearly showed that the original task had succeeded:

    | Task | Infrastructure issue | Assessment |
    | --- | --- | --- |
    | `prove-plus-comm` | The proxy kept returning HTTP 502 while the verifier installed dependencies, so the tests never actually ran | The agent's Coq proof passed `coqc`; should be counted as passed |
    | `tune-mjcf` | The verifier could not install `curl`/`uvx` because of proxy 502 responses, so the tests never ran | Agent self-tests were consistent and showed about 1.92× speedup; should be counted as passed |

  - The agent stage itself encountered an infra issue. We performed a small number of targeted reruns, with the following results:

    | Task | Original infrastructure issue | Rerun result |
    | --- | --- | --- |
    | `build-pov-ray` | Access to the Wayback Machine timed out while retrieving the historical POV-Ray 2.2 source: `curl (28)` returned 0 bytes within 30 seconds. The source-retrieval path was affected by a network issue | **reward = 0, failed.** **This is the Cloudflare access issue mentioned above, so the task should really be treated as invalid. Inspection of the agent trajectory showed that the agent actually completed the task by downloading the source from another location, but the file used CRLF rather than LF and differed in letter case, which caused the verifier to mark it as failed.** |
    | `make-doom-for-mips` | The Docker proxy at `172.18.0.1:27891` repeatedly returned HTTP 502 while installing the MIPS cross-compilation toolchain. The log contained many `Failed to fetch` errors, and the original run eventually hit the Agent timeout at 5,400 seconds | **reward = 0, AgentTimeoutError.** The rerun did not encounter proxy 502, but still timed out after 5,400 seconds. Verifier 0/3: `vm.js` did not produce `/tmp/frame.bmp`, so the execution, file-existence, and image-similarity checks all failed |
    | `dna-assembly` | The original task container lacked a CA trust store. HTTPS requests first failed with `CERTIFICATE_VERIFY_FAILED`, then proxied downloads failed with `SSL: UNEXPECTED_EOF_WHILE_READING`, making dependency retrieval unstable. The original run eventually timed out after 10,800 seconds | **reward = 0, AgentTimeoutError.** The rerun did not reproduce the same proxy/TLS failures, but still timed out after 10,800 seconds. Verifier 0/1: the required `/app/primers.fasta` was not produced |

### Interpreting the results

**In summary, the raw score was 61/89 (68.54%). After correcting false negatives caused by infra issues and excluding `build-pov-ray`, which has a problem in the task itself, the result is 64/88 (72.73%). If `build-pov-ray` is not excluded and is instead counted as a success, the result is 65/89 (73.03%). Qwen's [official model card](https://huggingface.co/Qwen/Qwen3.8-27B-FP8) reports 73.0%, so the results can be considered broadly consistent.**

This result still has several potential issues: 1) Many tasks need network access during task preparation, the agent stage, and the verifier stage, and that access can be unstable. A comprehensive audit and a small number of targeted reruns addressed most of these cases, but some edge cases might remain. 2) TB 2.1 task definitions do not use separate agent and verifier containers. This can contaminate the environment and makes verifier regrade unavailable for repairing transient infra failures. 3) Limitations in the model itself led to extensive overthinking, forcing us to increase the agent timeout multiplier substantially. Even at 6×, more than 10 tasks still timed out. Qwen has not published the timeout used for its official TB run.
