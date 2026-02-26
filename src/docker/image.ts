import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ToolProfile } from '../config/tools.js';
import {
  BASE_IMAGE,
  BASE_PACKAGES,
  CODER_UID,
  CODER_GID,
  CODER_USER,
  CODER_HOME,
  WORKSPACE_DIR,
  IMAGE_PREFIX,
} from '../config/constants.js';
import { dockerExec, dockerExecAsync } from './client.js';
import { ImageBuildError } from '../utils/errors.js';
import { Spinner } from '../utils/spinner.js';
import { GH_SETUP_SCRIPT, GH_BASHRC_HOOK } from '../github/setup-script.js';

export interface ImageOptions {
  github?: boolean;
}

export function getImageName(toolName: string, github?: boolean): string {
  const suffix = github ? '-github' : '';
  return `${IMAGE_PREFIX}${toolName}${suffix}:latest`;
}

export function generateDockerfile(profile: ToolProfile, options?: ImageOptions): string {
  const lines: string[] = [];
  const github = options?.github ?? false;

  lines.push(`FROM ${BASE_IMAGE}`);
  lines.push('');

  // Base packages
  const allPackages = [...BASE_PACKAGES, ...profile.packages];
  lines.push('RUN apt-get update && apt-get install -y --no-install-recommends \\');
  lines.push(`    ${allPackages.join(' ')} \\`);
  lines.push('    && rm -rf /var/lib/apt/lists/*');
  lines.push('');

  // GitHub CLI install (must run as root, before USER coder)
  if (github) {
    lines.push('RUN mkdir -p -m 755 /etc/apt/keyrings \\');
    lines.push('    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \\');
    lines.push('      -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \\');
    lines.push('    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \\');
    lines.push('    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \\');
    lines.push('      > /etc/apt/sources.list.d/github-cli.list \\');
    lines.push('    && apt-get update && apt-get install -y --no-install-recommends gh \\');
    lines.push('    && rm -rf /var/lib/apt/lists/*');
    lines.push('');
    lines.push('COPY nebubox-gh-setup /usr/local/bin/nebubox-gh-setup');
    lines.push('RUN chmod +x /usr/local/bin/nebubox-gh-setup');
    lines.push('COPY nebubox-bashrc-hook /tmp/nebubox-bashrc-hook');
    lines.push('');
  }

  // Non-root user (handles pre-existing GID/UID in base image)
  lines.push(`RUN groupadd --gid ${CODER_GID} ${CODER_USER} 2>/dev/null || true \\`);
  lines.push(`    && (useradd --uid ${CODER_UID} --gid ${CODER_GID} --shell /bin/bash --create-home ${CODER_USER} 2>/dev/null \\`);
  lines.push(`        || usermod --login ${CODER_USER} --shell /bin/bash --home ${CODER_HOME} --move-home $(id -nu ${CODER_UID}) 2>/dev/null || true) \\`);
  lines.push(`    && echo '${CODER_USER} ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers.d/${CODER_USER}`);
  lines.push('');

  lines.push(`USER ${CODER_USER}`);
  lines.push(`WORKDIR ${CODER_HOME}`);
  lines.push('');

  // Configure npm global installs under home directory.
  // Use ARG (not ENV) for NPM_CONFIG_PREFIX so it is available at build time
  // but NOT at runtime — some tools (e.g. Gemini CLI) re-exec themselves after
  // login, and a leftover NPM_CONFIG_PREFIX breaks Node's module resolution.
  lines.push(`ARG NPM_CONFIG_PREFIX="${CODER_HOME}/.npm-global"`);
  lines.push(`ENV PATH="${CODER_HOME}/.npm-global/bin:$PATH"`);
  lines.push('');

  // Tool-specific install
  for (const cmd of profile.installCommands) {
    lines.push(`RUN ${cmd}`);
  }

  // Environment variables
  for (const [key, value] of Object.entries(profile.envVars)) {
    lines.push(`ENV ${key}="${value}"`);
  }

  if (profile.installCommands.length > 0 || Object.keys(profile.envVars).length > 0) {
    lines.push('');
  }

  // GitHub .bashrc hook (runs as coder user)
  if (github) {
    lines.push(`RUN cat /tmp/nebubox-bashrc-hook >> ${CODER_HOME}/.bashrc`);
    lines.push('');
  }

  // Workspace
  lines.push(`RUN mkdir -p ${WORKSPACE_DIR}`);
  lines.push(`WORKDIR ${WORKSPACE_DIR}`);
  lines.push('');

  lines.push('ENTRYPOINT ["/bin/bash"]');
  lines.push('');

  return lines.join('\n');
}

export function imageExists(toolName: string, github?: boolean): boolean {
  const imageName = getImageName(toolName, github);
  const result = dockerExec(['image', 'inspect', imageName]);
  return result.status === 0;
}

export async function buildImage(profile: ToolProfile, noCache = false, options?: ImageOptions): Promise<void> {
  const github = options?.github ?? false;
  const imageName = getImageName(profile.name, github);
  const dockerfile = generateDockerfile(profile, options);

  const tmpDir = mkdtempSync(join(tmpdir(), 'nebubox-'));

  try {
    const dockerfilePath = join(tmpDir, 'Dockerfile');
    writeFileSync(dockerfilePath, dockerfile);

    // Write gh files into the build context so COPY can find them
    if (github) {
      writeFileSync(join(tmpDir, 'nebubox-gh-setup'), GH_SETUP_SCRIPT);
      writeFileSync(join(tmpDir, 'nebubox-bashrc-hook'), GH_BASHRC_HOOK);
    }

    const spinner = new Spinner();
    spinner.start(`Building image ${imageName}... (this may take a few minutes)`);

    const buildArgs = [
      'build',
      '-t', imageName,
      '-f', dockerfilePath,
    ];
    if (noCache) {
      buildArgs.push('--no-cache');
    }
    buildArgs.push(tmpDir);

    const result = await dockerExecAsync(buildArgs);

    if (result.status !== 0) {
      spinner.stop(`Failed to build image ${imageName}.`, false);
      throw new ImageBuildError(imageName, result.stderr);
    }

    spinner.stop(`Image ${imageName} built successfully.`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
