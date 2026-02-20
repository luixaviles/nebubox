import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getToolNames } from '../config/tools.js';
import { DockerNotFoundError, ValidationError } from './errors.js';

export function validateProjectPath(inputPath: string): string {
  const resolved = resolve(inputPath);
  if (!existsSync(resolved)) {
    throw new ValidationError(`Path does not exist: ${resolved}`);
  }
  const stat = statSync(resolved);
  if (!stat.isDirectory()) {
    throw new ValidationError(`Path is not a directory: ${resolved}`);
  }
  return resolved;
}

export function validateToolName(name: string): void {
  const valid = getToolNames();
  if (!valid.includes(name)) {
    throw new ValidationError(
      `Unknown tool "${name}". Available tools: ${valid.join(', ')}`
    );
  }
}

export function ensureDocker(): void {
  const result = spawnSync('docker', ['info'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new DockerNotFoundError();
  }
}
