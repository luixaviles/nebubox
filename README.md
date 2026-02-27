# Nebubox - AI Coding Tools, Safely Contained

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/luixaviles/nebubox/main/docs/assets/nebubox-logo-text-dark.svg" />
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/luixaviles/nebubox/main/docs/assets/nebubox-logo-text-light.svg" />
    <img src="https://raw.githubusercontent.com/luixaviles/nebubox/main/docs/assets/nebubox-logo-text-dark.svg" alt="Nebubox Logo" width="300" />
  </picture>
</p>

<p align="center">
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" alt="TypeScript" />
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-22%2B-green?logo=node.js" alt="Node.js" />
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  </a>
</p>

Run AI coding CLI tools safely inside Docker containers.

Running AI coding tools with full permissions is powerful but risky: a single bad command can reach well beyond your project directory. Nebubox wraps each tool in a Docker container where only your project directory is mounted, keeping everything else out of reach. You get an interactive shell inside the container and run the AI tool with full permissions, while Docker itself limits the blast radius.

## Features

- **Multi-tool support** — Claude Code, Gemini CLI, and Codex CLI out of the box
- **Filesystem isolation** — only the mounted project directory is accessible
- **Auth persistence** — credentials survive across container restarts via shared host directories
- **Zero runtime dependencies** — just Node.js and Docker
- **Non-root containers** — runs as `coder` user (UID 1000) with passwordless sudo

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [Docker](https://www.docker.com/) installed and running

## Installation

### npx (no install needed)

```bash
npx nebubox@latest start ./my-project
```

### Global install

```bash
npm install -g nebubox
```

### From source

```bash
git clone https://github.com/luixaviles/nebubox.git
cd nebubox
npm install
npm run build
npm link
```

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

## Commands

| Command | Description |
|---------|-------------|
| `nebubox start <path> [--tool <name>] [--rebuild] [--github]` | Create/start container and attach shell |
| `nebubox list [--tool <name>]` | List managed containers |
| `nebubox stop <name>` | Stop a running container |
| `nebubox attach <name>` | Attach to a running container |
| `nebubox remove <name>` | Remove a container |
| `nebubox build [<tool>] [--tool <name>] [--rebuild] [--github]` | Build or rebuild a tool's Docker image |

## Supported Tools

| Tool | Launch command inside container |
|------|-------------------------------|
| `claude` | `claude --dangerously-skip-permissions` |
| `gemini` | `gemini --approval-mode=yolo --sandbox=false` |
| `codex` | `codex --dangerously-bypass-approvals-and-sandbox` |

When `--tool` is omitted, nebubox presents an interactive prompt to select a tool.

## How It Works

Each tool has a **profile** that defines its install method, auth directory, and environment. Nebubox dynamically generates a Dockerfile from the profile, builds an image (`nebubox-<tool>:latest`), and creates containers with bind mounts:
- **Project** — `<your-project>` → `/home/coder/workspace`
- **Auth** — `~/.nebubox/auth/<tool>/` → tool's config directory in the container

Containers are named `nebubox-<tool>-<project-dir>` and labeled for easy filtering.

<div align="center">
  <img src="https://raw.githubusercontent.com/luixaviles/nebubox/main/docs/assets/nebubox-architecture.svg" alt="Nebubox Architecture" width="720" />
  <br />
  <em>Architecture diagram: nebubox mounts your project directory only – the rest of the host filesystem stays invisible</em>
</div>


### Directory Layout on Host

```
~/.nebubox/
  auth/
    claude/         # Claude Code credentials & config (~/.claude)
    gemini/         # Gemini CLI credentials
    codex/          # Codex CLI credentials
    github/         # GitHub CLI auth + .gitconfig (when --github is used)
```

### Auth Persistence

Nebubox stores each tool's credentials under `~/.nebubox/auth/<tool>/` on the host instead of sharing your existing config directories. The first time you start a container for a tool, authenticate inside it — after that, all containers for that tool reuse the same credentials regardless of which project they belong to.

- **Claude Code** — Nebubox sets `CLAUDE_CONFIG_DIR` to point to the mounted auth directory, so all config (`.claude.json`, `.credentials.json`, settings) lives in a single volume. This avoids [credential conflicts](https://github.com/anthropics/claude-code/issues/1414) between macOS and Linux. Run `claude login` on first use.
- **Gemini CLI** — Auth is stored in the standard `.gemini` directory. Note that Gemini re-execs itself after login, so `NPM_CONFIG_PREFIX` is set at build-time only to avoid module resolution issues. Run `gemini` and follow the login prompt on first use.
- **Codex CLI** — Auth is stored in the standard `.codex` directory. Run `codex` and follow the login prompt on first use.
- **GitHub CLI** (`--github`) — When you pass `--github`, Nebubox installs `gh` in the container image and mounts `~/.nebubox/auth/github/` for credential persistence. Run `gh auth login` on first use. Your git identity (`user.name` and `user.email`) is automatically configured from your GitHub account on the next shell session.

If you need to pick up configuration changes (e.g., after updating nebubox), rebuild your containers:

```bash
nebubox start ./my-project --tool claude --rebuild
```

Nebubox also auto-detects when `--github` has changed since the container was created and transparently recreates the container to match.

## Examples

```bash
# Build the Gemini image ahead of time
nebubox build gemini

# Rebuild image and recreate container
nebubox build claude --rebuild

# Rebuild to pick up image or config changes
nebubox start ./my-project --tool claude --rebuild

# Enable GitHub CLI for creating PRs, pushing, etc.
nebubox start ./my-project --tool claude --github

# Work on two projects with Claude Code
nebubox start ~/projects/frontend --tool claude
nebubox start ~/projects/backend --tool claude

# List all managed containers
nebubox list

# List only Gemini containers
nebubox list --tool gemini

# Reconnect to a container
nebubox attach nebubox-claude-frontend

# Stop and clean up
nebubox stop nebubox-claude-frontend
nebubox remove nebubox-claude-frontend
```

## Advanced

### GitHub CLI Integration (`--github`)

> Introduced in v0.2.0 — feedback welcome.

The `--github` flag installs [GitHub CLI](https://cli.github.com/) (`gh`) in the container and wires up credential and git identity persistence. This lets AI tools create PRs, push branches, and interact with the GitHub API from inside the sandbox.

**What it does:**

- Builds a **separate image** tagged `nebubox-<tool>-github:latest` (your regular image is untouched)
- Installs `gh` from the official apt repository
- Mounts `~/.nebubox/auth/github/` for credential and `.gitconfig` persistence across container rebuilds
- Auto-configures `git user.name` and `git user.email` from your GitHub account on every new shell session

**First-use workflow:**

```bash
# 1. Start with --github
nebubox start ./my-project --tool claude --github

# 2. Inside the container, authenticate once
gh auth login

# 3. Exit and re-attach (or open a new shell) —
#    git identity is automatically configured
exit
nebubox attach nebubox-claude-github-my-project
```

After the initial `gh auth login`, credentials persist on the host at `~/.nebubox/auth/github/`. All future containers started with `--github` reuse them automatically — no repeated login needed.

**Email scope:** The setup script tries to fetch your primary email via the GitHub API (requires the `user:email` scope). If the scope is not granted, it falls back to your GitHub noreply address (`<id>+<login>@users.noreply.github.com`). To use your real email, authorize the `user:email` scope during `gh auth login`.

**Pre-building the image:**

```bash
# Build the GitHub-enabled image ahead of time
nebubox build claude --github
```

**Overriding git identity:** The auto-configured identity can be changed at any time inside the container:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

These overrides persist across container restarts because `.gitconfig` lives in the mounted volume.

## Development

```bash
npm install
npm run build           # Compile TypeScript to dist/
npm test                # Run unit tests (vitest)
npm run test:watch      # Re-run tests on file changes
npm run test:coverage   # Run with V8 coverage
npm run test:docker     # Run E2E tests (requires Docker)
```

Unit tests live next to their source files as `src/**/*.test.ts`. E2E tests are in `scripts/e2e/` and exercise real Docker image builds, container lifecycle, and CLI behavior.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide, including project structure, coding style, and pull request workflow.

## License

MIT
