---
layout: default
title: Nebubox — AI Coding Tools, Safely Contained
description: Run AI coding CLI tools like Claude Code, Gemini CLI, and Codex safely inside Docker containers with filesystem isolation.
---

## Key Features

- **Multi-tool support** — Claude Code, Gemini CLI, and Codex CLI out of the box
- **Filesystem isolation** — only the mounted project directory is accessible
- **Auth persistence** — credentials survive across container restarts via shared host directories
- **Zero runtime dependencies** — just Node.js and Docker
- **Non-root containers** — runs as `coder` user (UID 1000) with passwordless sudo

## Architecture

![Nebubox Architecture]({{ site.baseurl }}/assets/nebubox-architecture.svg)

*Nebubox mounts your project directory only — the rest of the host filesystem stays invisible.*

## Supported Tools

| Tool | Launch command inside container |
|------|-------------------------------|
| Claude Code | `claude --dangerously-skip-permissions` |
| Gemini CLI | `gemini --approval-mode=yolo --sandbox=false` |
| Codex CLI | `codex --dangerously-bypass-approvals-and-sandbox` |

When `--tool` is omitted, Nebubox presents an interactive prompt to select a tool.

## Quick Start

```bash
# Start a container (interactive tool selection)
nebubox start ./my-project

# Start with a specific tool
nebubox start ./my-project --tool claude
nebubox start ./my-project --tool gemini
nebubox start ./my-project --tool codex

# Start with GitHub CLI support
nebubox start ./my-project --tool claude --github
```

This will:
1. Build the Docker image for the tool (first time only)
2. Create and start a container with your project mounted at `/home/coder/workspace`
3. Drop you into an interactive bash shell inside the container
4. Print a hint for how to launch the AI tool

When you exit the shell, the container keeps running. Reconnect anytime with `nebubox attach`.

## How It Works

Each tool has a **profile** that defines its install method, auth directory, and environment. Nebubox dynamically generates a Dockerfile from the profile, builds an image, and creates containers with bind mounts:

- **Project** — `<your-project>` → `/home/coder/workspace`
- **Auth** — `~/.nebubox/auth/<tool>/` → tool's config directory in the container

Containers are named `nebubox-<tool>-<project-dir>` and labeled for easy filtering.

### Directory Layout on Host

```
~/.nebubox/
  auth/
    claude/         # Claude Code credentials & config
    gemini/         # Gemini CLI credentials
    codex/          # Codex CLI credentials
    github/         # GitHub CLI auth + .gitconfig (when --github is used)
```

## Links

- [GitHub Repository](https://github.com/luixaviles/nebubox)
- [npm Package](https://www.npmjs.com/package/nebubox)
- [Contributing Guide](https://github.com/luixaviles/nebubox/blob/main/CONTRIBUTING.md)
