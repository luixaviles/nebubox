import { describe, it, expect, vi } from 'vitest';
import {
  getContainerName,
  containerExists,
  isContainerRunning,
  createContainer,
  startContainer,
  stopContainer,
  removeContainer,
  attachContainer,
  listContainers,
  getContainerImage,
} from './container.js';
import { CONTAINER_PREFIX, CODER_HOME, LABEL_MANAGED, LABEL_TOOL, LABEL_GITHUB } from '../config/constants.js';
import { ContainerError } from '../utils/errors.js';
import type { ToolProfile } from '../config/tools.js';
import { TOOL_PROFILES } from '../config/tools.js';

vi.mock('./client.js', () => ({
  dockerExec: vi.fn(),
  dockerInteractive: vi.fn(),
}));

vi.mock('./image.js', () => ({
  getImageName: vi.fn((tool: string, github?: boolean) => {
    const suffix = github ? '-github' : '';
    return `nebubox-${tool}${suffix}:latest`;
  }),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  writeFileSync: vi.fn(),
}));

vi.mock('../config/paths.js', () => ({
  ensureAuthDir: vi.fn((name: string) => `/tmp/fake-auth-dir/${name}`),
  ensureAuthFile: vi.fn((name: string) => `/tmp/fake-auth/${name}`),
}));

import { dockerExec, dockerInteractive } from './client.js';

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

describe('getContainerName', () => {
  it('returns prefixed name with tool and project basename', () => {
    expect(getContainerName('claude', '/home/user/my-project')).toBe(`${CONTAINER_PREFIX}claude-my-project`);
  });

  it('uses only the basename of the path', () => {
    expect(getContainerName('gemini', '/a/b/c/deep-project')).toBe(`${CONTAINER_PREFIX}gemini-deep-project`);
  });
});

describe('containerExists', () => {
  it('returns ContainerInfo when container is found', () => {
    vi.mocked(dockerExec).mockReturnValue({
      status: 0,
      stdout: 'nebubox-claude-proj\tUp 2 hours\tclaude\tproj\t/home/user/proj\tfalse',
      stderr: '',
    });

    const info = containerExists('nebubox-claude-proj');
    expect(info).toEqual({
      name: 'nebubox-claude-proj',
      status: 'Up 2 hours',
      tool: 'claude',
      project: 'proj',
      projectPath: '/home/user/proj',
      github: 'false',
    });
  });

  it('returns null when docker ps fails', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 1, stdout: '', stderr: 'error' });
    expect(containerExists('nocontainer')).toBeNull();
  });

  it('returns null when stdout is empty', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '', stderr: '' });
    expect(containerExists('nocontainer')).toBeNull();
  });

  it('returns null when output has insufficient parts', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'name\tstatus', stderr: '' });
    expect(containerExists('partial')).toBeNull();
  });

  it('queries the nebubox.github label', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '', stderr: '' });
    containerExists('test');
    const args = vi.mocked(dockerExec).mock.calls[0][0];
    const format = args.find((a: string) => a.includes('nebubox.github'));
    expect(format).toBeDefined();
  });
});

describe('isContainerRunning', () => {
  it('returns true when container is running', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'nebubox-claude-proj', stderr: '' });
    expect(isContainerRunning('nebubox-claude-proj')).toBe(true);
  });

  it('returns false when container is not running', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '', stderr: '' });
    expect(isContainerRunning('nebubox-claude-proj')).toBe(false);
  });

  it('returns false when docker ps fails', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 1, stdout: '', stderr: 'err' });
    expect(isContainerRunning('x')).toBe(false);
  });
});

describe('createContainer', () => {
  it('calls dockerExec with create args and returns container name', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'abc123', stderr: '' });

    const name = createContainer(mockProfile, '/home/user/proj');
    expect(name).toBe(`${CONTAINER_PREFIX}claude-proj`);
    expect(dockerExec).toHaveBeenCalledWith(expect.arrayContaining([
      'create',
      '--name', `${CONTAINER_PREFIX}claude-proj`,
    ]));
  });

  it('throws ContainerError on failure', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 1, stdout: '', stderr: 'conflict' });
    expect(() => createContainer(mockProfile, '/home/user/proj')).toThrow(ContainerError);
  });

  it('mounts auth files from profile', () => {
    const profileWithAuthFiles: ToolProfile = { ...mockProfile, authFiles: ['.test.json'] };
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'abc', stderr: '' });
    createContainer(profileWithAuthFiles, '/home/user/proj');

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    const vIndex = args.lastIndexOf('-v');
    expect(args[vIndex + 1]).toContain('.test.json');
  });

  it('sets nebubox.github label to false when github is not enabled', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'abc', stderr: '' });
    createContainer(mockProfile, '/home/user/proj');

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    expect(args).toContain(`${LABEL_GITHUB}=false`);
  });

  it('sets nebubox.github label to true when github is enabled', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'abc', stderr: '' });
    createContainer(mockProfile, '/home/user/proj', { github: true });

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    expect(args).toContain(`${LABEL_GITHUB}=true`);
  });
});

describe('createContainer per provider', () => {
  it.each(Object.entries(TOOL_PROFILES))('%s: mounts correct auth directory', (_name, profile) => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'abc', stderr: '' });
    createContainer(profile, '/home/user/proj');

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    const expectedContainerPath = `${CODER_HOME}/${profile.authDir}`;
    // Find the -v arg that contains the authDir mount
    const vArgs = args.filter((_: string, i: number) => args[i - 1] === '-v');
    const authDirMount = vArgs.find((v: string) => v.includes(expectedContainerPath));
    expect(authDirMount).toBeDefined();
    expect(authDirMount).toContain(expectedContainerPath);
  });

  it.each(Object.entries(TOOL_PROFILES))('%s: generates correct number of -v mounts', (_name, profile) => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'abc', stderr: '' });
    createContainer(profile, '/home/user/proj');

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    const vCount = args.filter((a: string) => a === '-v').length;
    // project mount + authDir mount + one per authFile
    const expected = 2 + profile.authFiles.length;
    expect(vCount).toBe(expected);
  });

  it('does not add auth file mounts when authFiles is empty', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'abc', stderr: '' });
    // Use gemini profile which has empty authFiles
    const geminiProfile = TOOL_PROFILES['gemini'];
    createContainer(geminiProfile, '/home/user/proj');

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    const vCount = args.filter((a: string) => a === '-v').length;
    // Only project mount + authDir mount, no authFile mounts
    expect(vCount).toBe(2);
  });
});

describe('createContainer with github', () => {
  it('adds 1 extra volume mount for github auth dir', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'abc', stderr: '' });
    createContainer(mockProfile, '/home/user/proj', { github: true });

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    const vCount = args.filter((a: string) => a === '-v').length;
    // project + authDir + github auth dir = 3
    const expected = 2 + mockProfile.authFiles.length + 1;
    expect(vCount).toBe(expected);
  });

  it('mounts gh config dir to /home/coder/.config/gh', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'abc', stderr: '' });
    createContainer(mockProfile, '/home/user/proj', { github: true });

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    const vArgs = args.filter((_: string, i: number) => args[i - 1] === '-v');
    const ghMount = vArgs.find((v: string) => v.includes(`${CODER_HOME}/.config/gh`));
    expect(ghMount).toBeDefined();
  });

  it('uses github image name', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'abc', stderr: '' });
    createContainer(mockProfile, '/home/user/proj', { github: true });

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    // The last arg is the image name
    const lastArg = args[args.length - 1];
    expect(lastArg).toContain('-github:latest');
  });
});

describe('startContainer', () => {
  it('calls dockerExec with start', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '', stderr: '' });
    startContainer('mycontainer');
    expect(dockerExec).toHaveBeenCalledWith(['start', 'mycontainer']);
  });

  it('throws ContainerError on failure', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 1, stdout: '', stderr: 'no such container' });
    expect(() => startContainer('bad')).toThrow(ContainerError);
  });
});

describe('stopContainer', () => {
  it('calls dockerExec with stop', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '', stderr: '' });
    stopContainer('mycontainer');
    expect(dockerExec).toHaveBeenCalledWith(['stop', 'mycontainer']);
  });

  it('throws ContainerError on failure', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 1, stdout: '', stderr: 'err' });
    expect(() => stopContainer('bad')).toThrow(ContainerError);
  });
});

describe('removeContainer', () => {
  it('calls dockerExec with rm -f', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '', stderr: '' });
    removeContainer('mycontainer');
    expect(dockerExec).toHaveBeenCalledWith(['rm', '-f', 'mycontainer']);
  });

  it('throws ContainerError on failure', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 1, stdout: '', stderr: 'err' });
    expect(() => removeContainer('bad')).toThrow(ContainerError);
  });
});

describe('attachContainer', () => {
  it('calls dockerInteractive with exec -it and bash', () => {
    vi.mocked(dockerInteractive).mockReturnValue(0);
    const code = attachContainer('mycontainer');
    expect(dockerInteractive).toHaveBeenCalledWith(['exec', '-it', 'mycontainer', '/bin/bash']);
    expect(code).toBe(0);
  });
});

describe('listContainers', () => {
  it('returns parsed container list', () => {
    vi.mocked(dockerExec).mockReturnValue({
      status: 0,
      stdout: 'c1\tUp\tclaude\tproj1\t/p1\tfalse\nc2\tExited\tgemini\tproj2\t/p2\ttrue',
      stderr: '',
    });

    const list = listContainers();
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({
      name: 'c1',
      status: 'Up',
      tool: 'claude',
      project: 'proj1',
      projectPath: '/p1',
      github: 'false',
    });
    expect(list[1]).toEqual({
      name: 'c2',
      status: 'Exited',
      tool: 'gemini',
      project: 'proj2',
      projectPath: '/p2',
      github: 'true',
    });
  });

  it('returns empty array when docker ps fails', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 1, stdout: '', stderr: 'err' });
    expect(listContainers()).toEqual([]);
  });

  it('returns empty array when stdout is empty', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '', stderr: '' });
    expect(listContainers()).toEqual([]);
  });

  it('filters by tool when provided', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '', stderr: '' });
    listContainers('claude');

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    expect(args).toContain('--filter');
    expect(args).toContain(`label=${LABEL_TOOL}=claude`);
  });

  it('includes managed label filter', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '', stderr: '' });
    listContainers();

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    expect(args).toContain(`label=${LABEL_MANAGED}=true`);
  });

  it('queries the nebubox.github label', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: '', stderr: '' });
    listContainers();

    const args = vi.mocked(dockerExec).mock.calls[0][0];
    const format = args.find((a: string) => a.includes('nebubox.github'));
    expect(format).toBeDefined();
  });
});

describe('getContainerImage', () => {
  it('returns image name on success', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 0, stdout: 'nebubox-claude:latest', stderr: '' });
    expect(getContainerImage('mycontainer')).toBe('nebubox-claude:latest');
  });

  it('returns empty string on failure', () => {
    vi.mocked(dockerExec).mockReturnValue({ status: 1, stdout: '', stderr: 'err' });
    expect(getContainerImage('bad')).toBe('');
  });
});
