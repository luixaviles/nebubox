import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getToolProfile } from '../config/tools.js';
import { buildImage, imageExists } from '../docker/image.js';
import {
  containerExists,
  isContainerRunning,
  createContainer,
  startContainer,
  stopContainer,
  removeContainer,
  attachContainer,
  getContainerName,
} from '../docker/container.js';
import { ensureDocker, validateProjectPath, validateToolName } from '../utils/validation.js';
import { getAuthDir } from '../config/paths.js';
import * as log from '../utils/logger.js';

export interface StartOptions {
  path: string;
  tool: string;
  noCache: boolean;
  recreate: boolean;
  github: boolean;
}

export async function startCommand(opts: StartOptions): Promise<void> {
  validateToolName(opts.tool);
  const projectPath = validateProjectPath(opts.path);
  ensureDocker();

  const profile = getToolProfile(opts.tool)!;
  const containerName = getContainerName(profile.name, projectPath);

  const imageOpts = opts.github ? { github: true } : undefined;

  // Ensure image exists
  if (!imageExists(profile.name, opts.github)) {
    log.info(`Image for ${profile.displayName} not found. Building...`);
    await buildImage(profile, opts.noCache, imageOpts);
  } else if (opts.noCache) {
    log.info(`Rebuilding image for ${profile.displayName} (--no-cache)...`);
    await buildImage(profile, true, imageOpts);
  }

  // Recreate container if requested
  if (opts.recreate && containerExists(containerName)) {
    if (isContainerRunning(containerName)) {
      stopContainer(containerName);
    }
    removeContainer(containerName);
    log.info(`Removed old container ${containerName}.`);
  }

  // Check if container already exists
  const existing = containerExists(containerName);

  if (existing) {
    if (isContainerRunning(containerName)) {
      log.info(`Container ${containerName} is already running. Attaching...`);
    } else {
      log.info(`Starting existing container ${containerName}...`);
      startContainer(containerName);
      log.success(`Container ${containerName} started.`);
    }
  } else {
    log.step(`Creating container ${containerName}...`);
    createContainer(profile, projectPath, opts.github ? { github: true } : undefined);
    startContainer(containerName);
    log.success(`Container ${containerName} created and started.`);
  }

  log.hint(profile.hint);

  if (opts.github) {
    const hostsFile = join(getAuthDir('github'), 'hosts.yml');
    if (existsSync(hostsFile)) {
      log.hint('GitHub CLI is ready.');
    } else {
      log.hint('Run `gh auth login` inside the container to authenticate with GitHub.');
    }
  }

  // Attach interactive shell - blocks until user exits
  attachContainer(containerName);

  log.info(`Detached from ${containerName}. Container is still running.`);
  log.info(`Use \`nebubox attach ${containerName}\` to reconnect.`);
  log.info(`Use \`nebubox stop ${containerName}\` to stop it.`);
}
