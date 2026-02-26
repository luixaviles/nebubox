import { existsSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { ToolProfile } from '../config/tools.js';
import {
  CONTAINER_PREFIX,
  LABEL_MANAGED,
  LABEL_TOOL,
  LABEL_PROJECT,
  LABEL_PROJECT_PATH,
  CODER_HOME,
  WORKSPACE_DIR,
} from '../config/constants.js';
import { ensureAuthDir, ensureAuthFile } from '../config/paths.js';
import { dockerExec, dockerInteractive } from './client.js';
import { getImageName } from './image.js';
import { ContainerError } from '../utils/errors.js';

export interface ContainerOptions {
  github?: boolean;
}

export interface ContainerInfo {
  name: string;
  status: string;
  tool: string;
  project: string;
  projectPath: string;
}

export function getContainerName(toolName: string, projectPath: string): string {
  const projectBasename = basename(projectPath);
  return `${CONTAINER_PREFIX}${toolName}-${projectBasename}`;
}

export function containerExists(name: string): ContainerInfo | null {
  const result = dockerExec([
    'ps', '-a',
    '--filter', `name=^/${name}$`,
    '--format', '{{.Names}}\t{{.Status}}\t{{.Label "nebubox.tool"}}\t{{.Label "nebubox.project"}}\t{{.Label "nebubox.project-path"}}',
  ]);

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  const parts = result.stdout.split('\t');
  if (parts.length < 5) return null;

  return {
    name: parts[0],
    status: parts[1],
    tool: parts[2],
    project: parts[3],
    projectPath: parts[4],
  };
}

export function isContainerRunning(name: string): boolean {
  const result = dockerExec([
    'ps',
    '--filter', `name=^/${name}$`,
    '--filter', 'status=running',
    '--format', '{{.Names}}',
  ]);
  return result.status === 0 && result.stdout.length > 0;
}

export function createContainer(
  profile: ToolProfile,
  projectPath: string,
  options?: ContainerOptions,
): string {
  const github = options?.github ?? false;
  const name = getContainerName(profile.name, projectPath);
  const imageName = getImageName(profile.name, github);
  const hostAuthDir = ensureAuthDir(profile.name);
  const containerAuthDir = `${CODER_HOME}/${profile.authDir}`;
  const projectBasename = basename(projectPath);

  const createArgs = [
    'create',
    '--name', name,
    '--label', `${LABEL_MANAGED}=true`,
    '--label', `${LABEL_TOOL}=${profile.name}`,
    '--label', `${LABEL_PROJECT}=${projectBasename}`,
    '--label', `${LABEL_PROJECT_PATH}=${projectPath}`,
    '-it',
    '-v', `${projectPath}:${WORKSPACE_DIR}`,
    '-v', `${hostAuthDir}:${containerAuthDir}`,
  ];

  for (const authFile of profile.authFiles) {
    const hostFile = ensureAuthFile(authFile);
    const containerFile = `${CODER_HOME}/${authFile}`;
    createArgs.push('-v', `${hostFile}:${containerFile}`);
  }

  // GitHub CLI: mount gh config dir (contains .gitconfig too)
  if (github) {
    const ghAuthDir = ensureAuthDir('github');
    createArgs.push('-v', `${ghAuthDir}:${CODER_HOME}/.config/gh`);

    // Ensure .gitconfig exists inside the mounted dir so git can find it.
    // GIT_CONFIG_GLOBAL (set in the image) points here, avoiding a
    // file bind mount which breaks git's atomic write pattern.
    const gitconfigPath = join(ghAuthDir, '.gitconfig');
    if (!existsSync(gitconfigPath)) {
      writeFileSync(gitconfigPath, '');
    }
  }

  createArgs.push('-w', WORKSPACE_DIR, imageName);

  const result = dockerExec(createArgs);

  if (result.status !== 0) {
    throw new ContainerError('create', name, result.stderr);
  }

  return name;
}

export function startContainer(name: string): void {
  const result = dockerExec(['start', name]);
  if (result.status !== 0) {
    throw new ContainerError('start', name, result.stderr);
  }
}

export function stopContainer(name: string): void {
  const result = dockerExec(['stop', name]);
  if (result.status !== 0) {
    throw new ContainerError('stop', name, result.stderr);
  }
}

export function removeContainer(name: string): void {
  const result = dockerExec(['rm', '-f', name]);
  if (result.status !== 0) {
    throw new ContainerError('remove', name, result.stderr);
  }
}

export function attachContainer(name: string): number {
  return dockerInteractive(['exec', '-it', name, '/bin/bash']);
}

export function listContainers(toolFilter?: string): ContainerInfo[] {
  const args = [
    'ps', '-a',
    '--filter', `label=${LABEL_MANAGED}=true`,
  ];

  if (toolFilter) {
    args.push('--filter', `label=${LABEL_TOOL}=${toolFilter}`);
  }

  args.push(
    '--format',
    '{{.Names}}\t{{.Status}}\t{{.Label "nebubox.tool"}}\t{{.Label "nebubox.project"}}\t{{.Label "nebubox.project-path"}}',
  );

  const result = dockerExec(args);

  if (result.status !== 0 || !result.stdout) {
    return [];
  }

  return result.stdout.split('\n').map((line) => {
    const parts = line.split('\t');
    return {
      name: parts[0],
      status: parts[1],
      tool: parts[2],
      project: parts[3],
      projectPath: parts[4],
    };
  });
}
