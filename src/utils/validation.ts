import { existsSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getToolNames } from '../config/tools.js';
import { WORKSPACE_DIR } from '../config/constants.js';
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

/**
 * Validates and normalizes a `--mount` spec into a `docker create -v` value.
 *
 * Accepted forms (the container path defaults to `/home/coder/workspace/<host-basename>`,
 * i.e. alongside your project):
 *   host                        -> host:/home/coder/workspace/<basename>
 *   host:ro | host:rw           -> host:/home/coder/workspace/<basename>:<mode>
 *   host:dest                   -> host:/home/coder/workspace/dest   (relative dest)
 *   host:/abs/dest              -> host:/abs/dest                    (absolute dest, verbatim)
 *   host:dest:ro                -> host:/home/coder/workspace/dest:ro
 *
 * The second segment is treated as the mode only when it is exactly `ro`/`rw`;
 * otherwise it is a destination. Relative host paths are resolved to absolute,
 * and the host path must exist.
 */
export function validateMount(spec: string): string {
  const parts = spec.split(':');
  if (parts.length > 3) {
    throw new ValidationError(
      `Invalid mount "${spec}". Expected format: <host-path>[:<container-path>][:ro|rw]`
    );
  }

  const hostPart = parts[0];
  if (!hostPart) {
    throw new ValidationError(`Invalid mount "${spec}": missing host path`);
  }

  let destPart: string | undefined;
  let mode: string | undefined;

  if (parts.length === 3) {
    destPart = parts[1];
    mode = parts[2];
  } else if (parts.length === 2) {
    // A lone second segment is a mode only when it's exactly ro/rw.
    if (parts[1] === 'ro' || parts[1] === 'rw') {
      mode = parts[1];
    } else {
      destPart = parts[1];
    }
  }

  if (mode !== undefined && mode !== 'ro' && mode !== 'rw') {
    throw new ValidationError(
      `Invalid mount "${spec}": mode must be "ro" or "rw", got "${mode}"`
    );
  }

  const resolvedHost = resolve(hostPart);
  if (!existsSync(resolvedHost)) {
    throw new ValidationError(`Mount host path does not exist: ${resolvedHost}`);
  }

  // Default to /home/coder/workspace/<host-basename> (alongside the project);
  // a relative destination is placed under the workspace, an absolute one is
  // used as-is.
  let containerPath: string;
  if (!destPart) {
    containerPath = `${WORKSPACE_DIR}/${basename(resolvedHost)}`;
  } else if (destPart.startsWith('/')) {
    containerPath = destPart;
  } else {
    containerPath = `${WORKSPACE_DIR}/${destPart}`;
  }

  return mode ? `${resolvedHost}:${containerPath}:${mode}` : `${resolvedHost}:${containerPath}`;
}

export function ensureDocker(): void {
  const result = spawnSync('docker', ['info'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new DockerNotFoundError();
  }
}
