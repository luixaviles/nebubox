# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-06-25

### Added
- Added support for running Playwright screenshots/testing inside sandbox containers via the `--playwright` flag.
- Added automated Debian/Chromium graphics rendering system dependencies setup during image build.
- Configured a persistent host cache volume at `~/.nebubox/playwright-cache/` to map to `/home/coder/.cache/ms-playwright` in the container, avoiding redownloading browsers on reconstruction.
- Updated documentation index and README with Playwright setup instructions.

### Fixed
- Fixed Antigravity CLI credentials persistence and sharing across project containers by mounting the host auth folder to the correct guest data directory `~/.gemini/antigravity-cli/` instead of `.config/antigravity`.
