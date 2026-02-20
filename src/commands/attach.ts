import {
  containerExists,
  isContainerRunning,
  startContainer,
  attachContainer,
} from '../docker/container.js';
import { ensureDocker } from '../utils/validation.js';
import { NebuboxError } from '../utils/errors.js';
import * as log from '../utils/logger.js';

export function attachCommand(name: string): void {
  ensureDocker();

  const existing = containerExists(name);
  if (!existing) {
    throw new NebuboxError(`Container "${name}" not found.`);
  }

  if (!isContainerRunning(name)) {
    log.info(`Container "${name}" is not running. Starting it first...`);
    startContainer(name);
    log.success(`Container ${name} started.`);
  }

  log.info(`Attaching to ${name}...`);
  attachContainer(name);
  log.info(`Detached from ${name}. Container is still running.`);
}
