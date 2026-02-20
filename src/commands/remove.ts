import { containerExists, removeContainer } from '../docker/container.js';
import { ensureDocker } from '../utils/validation.js';
import { NebuboxError } from '../utils/errors.js';
import * as log from '../utils/logger.js';

export function removeCommand(name: string): void {
  ensureDocker();

  const existing = containerExists(name);
  if (!existing) {
    throw new NebuboxError(`Container "${name}" not found.`);
  }

  log.step(`Removing container ${name}...`);
  removeContainer(name);
  log.success(`Container ${name} removed.`);
}
