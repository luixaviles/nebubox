# Contributing to Nebubox

Thanks for your interest in contributing! This guide covers everything you
need to get started.

## Prerequisites

- **Node.js** >= 22
- **Docker** (for E2E tests and running the tool itself)
- **npm** (ships with Node.js)

## Getting Started

```bash
git clone https://github.com/<your-fork>/nebubox.git
cd nebubox
npm install
npm run build
```

The build step compiles TypeScript from `src/` into `dist/`.

## Project Structure

```
src/
  commands/   # CLI command implementations
  config/     # Constants, tool profiles, path helpers
  docker/     # Docker client, image builder, container management
  github/     # GitHub CLI setup script and .bashrc hook
  utils/      # Arg parsing, validation, logging, error helpers
  index.ts    # Entry point
scripts/e2e/  # End-to-end test scripts (bash + Docker)
test/         # Shared test utilities (e.g. isolated HOME helper)
```

Unit tests live next to the code they cover (`src/**/*.test.ts`).

## Coding Style

- **ESM-only** — the project uses `"type": "module"` with Node.js `NodeNext`
  module resolution.
- **TypeScript strict mode** — `strict: true` in `tsconfig.json`.
- **Colocated tests** — every test file sits beside its source file and is
  named `*.test.ts`.
- **Zero runtime dependencies** — only `devDependencies` are allowed. All
  functionality relies on Node.js built-ins and the Docker CLI.
- **No linter** — there is no ESLint or Prettier configured. Keep your code
  consistent with the existing style in the files you edit.

## Testing

### Unit tests

```bash
npm test              # single run (vitest)
npm run test:watch    # re-run on file changes
npm run test:coverage # run with V8 coverage (70 % threshold)
```

Unit tests are colocated in `src/` as `*.test.ts` files. The vitest config
excludes `*.e2e.test.ts` and `*.live.test.ts` patterns from unit runs.

### End-to-end tests

```bash
npm run test:docker   # runs all E2E scripts (requires Docker)
```

E2E tests live in `scripts/e2e/` and exercise real Docker image builds,
container start/stop, environment isolation, and CLI behaviour.

Clean up leftover test containers and images:

```bash
npm run test:docker:cleanup
```

## Commit Conventions

- Use a concise imperative subject line (e.g. "Add volume mount validation").
- Explain **what** and **why** in the body when the change is non-trivial.
- Keep commits focused — one logical change per commit.

## Pull Request Workflow

1. Fork the repository and create a feature branch from `main`.
2. Make your changes and add or update tests as needed.
3. Run the full test suite:
   ```bash
   npm test
   ```
   If your change touches Docker logic, also run `npm run test:docker`.
4. Push your branch and open a pull request against `main`.
5. Describe what you changed and why in the PR description.

We review PRs as quickly as we can. Smaller, well-tested PRs are easier to
review and merge.
