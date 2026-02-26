import { describe, it, expect, vi } from 'vitest';
import { getImageName, generateDockerfile, imageExists } from './image.js';
import type { ToolProfile } from '../config/tools.js';
import { TOOL_PROFILES } from '../config/tools.js';
import { IMAGE_PREFIX, BASE_IMAGE, BASE_PACKAGES, CODER_USER, CODER_HOME, WORKSPACE_DIR } from '../config/constants.js';

vi.mock('./client.js', () => ({
  dockerExec: vi.fn(),
  dockerExecAsync: vi.fn(),
}));

import { dockerExec } from './client.js';

const mockProfile: ToolProfile = {
  name: 'claude',
  displayName: 'Claude Code',
  packages: [],
  installCommands: ['curl -fsSL https://claude.ai/install.sh | bash'],
  envVars: { PATH: '/home/coder/.local/bin:$PATH', CLAUDE_CONFIG_DIR: '/home/coder/.claude' },
  authDir: '.claude',
  authFiles: [],
  hint: 'Run claude',
};

describe('getImageName', () => {
  it('returns prefixed image name with :latest tag', () => {
    expect(getImageName('claude')).toBe(`${IMAGE_PREFIX}claude:latest`);
    expect(getImageName('gemini')).toBe(`${IMAGE_PREFIX}gemini:latest`);
  });

  it('appends -github suffix when github is true', () => {
    expect(getImageName('claude', true)).toBe(`${IMAGE_PREFIX}claude-github:latest`);
  });

  it('does not append suffix when github is false', () => {
    expect(getImageName('claude', false)).toBe(`${IMAGE_PREFIX}claude:latest`);
  });
});

describe('generateDockerfile', () => {
  it('starts with FROM base image', () => {
    const df = generateDockerfile(mockProfile);
    expect(df).toMatch(new RegExp(`^FROM ${BASE_IMAGE}`));
  });

  it('installs base packages', () => {
    const df = generateDockerfile(mockProfile);
    for (const pkg of BASE_PACKAGES) {
      expect(df).toContain(pkg);
    }
  });

  it('installs tool-specific packages when present', () => {
    const profile: ToolProfile = { ...mockProfile, packages: ['python3'] };
    const df = generateDockerfile(profile);
    expect(df).toContain('python3');
  });

  it('creates non-root user', () => {
    const df = generateDockerfile(mockProfile);
    expect(df).toContain(`USER ${CODER_USER}`);
  });

  it('includes install commands', () => {
    const df = generateDockerfile(mockProfile);
    expect(df).toContain('RUN curl -fsSL https://claude.ai/install.sh | bash');
  });

  it('sets environment variables', () => {
    const df = generateDockerfile(mockProfile);
    expect(df).toContain('ENV PATH="/home/coder/.local/bin:$PATH"');
  });

  it('sets up workspace directory', () => {
    const df = generateDockerfile(mockProfile);
    expect(df).toContain(`RUN mkdir -p ${WORKSPACE_DIR}`);
    expect(df).toContain(`WORKDIR ${WORKSPACE_DIR}`);
  });

  it('sets bash entrypoint', () => {
    const df = generateDockerfile(mockProfile);
    expect(df).toContain('ENTRYPOINT ["/bin/bash"]');
  });

  it('handles profile with no install commands or envVars', () => {
    const bare: ToolProfile = {
      ...mockProfile,
      installCommands: [],
      envVars: {},
    };
    const df = generateDockerfile(bare);
    expect(df).toContain(`FROM ${BASE_IMAGE}`);
    expect(df).toContain('ENTRYPOINT ["/bin/bash"]');
  });
});

describe('generateDockerfile with github', () => {
  it('includes gh CLI install block when github is true', () => {
    const df = generateDockerfile(mockProfile, { github: true });
    expect(df).toContain('/etc/apt/keyrings/githubcli-archive-keyring.gpg');
    expect(df).toContain('apt-get install -y --no-install-recommends gh');
  });

  it('includes COPY nebubox-gh-setup before USER coder', () => {
    const df = generateDockerfile(mockProfile, { github: true });
    const copyIndex = df.indexOf('COPY nebubox-gh-setup');
    const userIndex = df.indexOf(`USER ${CODER_USER}`);
    expect(copyIndex).toBeGreaterThan(-1);
    expect(userIndex).toBeGreaterThan(-1);
    expect(copyIndex).toBeLessThan(userIndex);
  });

  it('appends bashrc hook after USER coder', () => {
    const df = generateDockerfile(mockProfile, { github: true });
    const userIndex = df.indexOf(`USER ${CODER_USER}`);
    const hookIndex = df.indexOf('cat /tmp/nebubox-bashrc-hook');
    expect(hookIndex).toBeGreaterThan(-1);
    expect(hookIndex).toBeGreaterThan(userIndex);
  });

  it('copies bashrc hook file before USER coder', () => {
    const df = generateDockerfile(mockProfile, { github: true });
    const copyIndex = df.indexOf('COPY nebubox-bashrc-hook');
    const userIndex = df.indexOf(`USER ${CODER_USER}`);
    expect(copyIndex).toBeGreaterThan(-1);
    expect(copyIndex).toBeLessThan(userIndex);
  });

  it('does not include gh install when github is not set', () => {
    const df = generateDockerfile(mockProfile);
    expect(df).not.toContain('githubcli-archive-keyring.gpg');
    expect(df).not.toContain('COPY nebubox-gh-setup');
  });
});

describe('generateDockerfile per provider', () => {
  it.each(Object.entries(TOOL_PROFILES))('%s: includes all install commands', (_name, profile) => {
    const df = generateDockerfile(profile);
    for (const cmd of profile.installCommands) {
      expect(df).toContain(`RUN ${cmd}`);
    }
  });

  it.each(Object.entries(TOOL_PROFILES))('%s: sets ENV only when envVars is non-empty', (_name, profile) => {
    const df = generateDockerfile(profile);
    // NPM_CONFIG_PREFIX is a build-time ARG (not ENV) so it doesn't
    // leak into runtime and confuse tools that re-exec themselves.
    expect(df).toContain(`ARG NPM_CONFIG_PREFIX="${CODER_HOME}/.npm-global"`);
    expect(df).toContain(`ENV PATH="${CODER_HOME}/.npm-global/bin:$PATH"`);

    // Only providers with envVars get additional ENV lines
    const envLines = df.split('\n').filter((line) => line.startsWith('ENV '));
    if (Object.keys(profile.envVars).length > 0) {
      // 1 npm PATH ENV + tool-specific ENVs
      expect(envLines.length).toBe(1 + Object.keys(profile.envVars).length);
    } else {
      // Only the 1 built-in npm PATH ENV line
      expect(envLines.length).toBe(1);
    }
  });

  it.each(Object.entries(TOOL_PROFILES))('%s: uses correct install mechanism', (_name, profile) => {
    const df = generateDockerfile(profile);
    const usesCurl = profile.installCommands.some((cmd) => cmd.includes('curl'));
    const usesNpm = profile.installCommands.some((cmd) => cmd.includes('npm install'));

    if (usesCurl) {
      expect(df).toMatch(/RUN curl/);
      expect(df).not.toMatch(/RUN npm install -g/);
    }
    if (usesNpm) {
      expect(df).toMatch(/RUN npm install -g/);
      expect(df).not.toMatch(/RUN curl/);
    }
  });
});

describe('imageExists', () => {
  it('returns true when docker image inspect succeeds', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '[]', stderr: '' });
    expect(imageExists('claude')).toBe(true);
    expect(dockerExec).toHaveBeenCalledWith(['image', 'inspect', `${IMAGE_PREFIX}claude:latest`]);
  });

  it('returns false when docker image inspect fails', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 1, stdout: '', stderr: 'No such image' });
    expect(imageExists('nonexistent')).toBe(false);
  });
});
