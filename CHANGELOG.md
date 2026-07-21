# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added a repeatable `--mount <host-path>[:<dest>][:ro|rw]` flag to `nebubox start` for exposing additional host paths inside the container. The destination is optional and defaults to `/home/coder/workspace/<host-basename>` (alongside your project); a relative destination is placed under the workspace, an absolute one is used verbatim. Host paths must exist; mounts are applied when the container is first created (use `--rebuild` to change them on an existing container).

## [0.5.1] - 2026-06-25

### Fixed
- Fixed permission denied issues in the Antigravity CLI container by mounting the entire `.gemini` folder instead of `.gemini/antigravity-cli`. This ensures `/home/coder/.gemini` is owned by the container `coder` user instead of the host `root` user.

## [0.5.0] - 2026-06-25

### Added
- Added support for running Playwright screenshots/testing inside sandbox containers via the `--playwright` flag.
- Added automated Debian/Chromium graphics rendering system dependencies setup during image build.
- Configured a persistent host cache volume at `~/.nebubox/playwright-cache/` to map to `/home/coder/.cache/ms-playwright` in the container, avoiding redownloading browsers on reconstruction.
- Updated documentation index and README with Playwright setup instructions.

### Fixed
- Fixed Antigravity CLI credentials persistence and sharing across project containers by mounting the host auth folder to the correct guest data directory `~/.gemini/antigravity-cli/` instead of `.config/antigravity`.
