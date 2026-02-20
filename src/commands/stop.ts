import { containerExists, isContainerRunning, stopContainer } from '../docker/container.js';
import { ensureDocker } from '../utils/validation.js';
import { NebuboxError } from '../utils/errors.js';
import * as log from '../utils/logger.js';

export function stopCommand(name: string): void {
  ensureDocker();

  const existing = containerExists(name);
  if (!existing) {
    throw new NebuboxError(`Container "${name}" not found.`);
  }

  if (!isContainerRunning(name)) {
    log.info(`Container "${name}" is not running.`);
    return;
  }

  log.step(`Stopping container ${name}...`);
  stopContainer(name);
  log.success(`Container ${name} stopped.`);
}
