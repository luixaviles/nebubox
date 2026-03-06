import { listContainers } from '../docker/container.js';
import { ensureDocker, validateToolName } from '../utils/validation.js';
import * as log from '../utils/logger.js';

export interface ListOptions {
  tool?: string;
}

export function listCommand(opts: ListOptions): void {
  if (opts.tool) {
    validateToolName(opts.tool);
  }
  ensureDocker();

  const containers = listContainers(opts.tool);

  if (containers.length === 0) {
    log.info(opts.tool
      ? `No nebubox containers found for tool "${opts.tool}".`
      : 'No nebubox containers found.',
    );
    return;
  }

  log.header('Managed containers:');
  console.log('');
  console.log(
    padRight('NAME', 40) +
    padRight('STATUS', 25) +
    padRight('TOOL', 12) +
    padRight('GITHUB', 10) +
    padRight('PNPM', 8) +
    'PROJECT',
  );
  console.log('-'.repeat(108));

  for (const c of containers) {
    console.log(
      padRight(c.name, 40) +
      padRight(c.status, 25) +
      padRight(c.tool, 12) +
      padRight(c.github === 'true' ? 'yes' : 'no', 10) +
      padRight(c.pnpm === 'true' ? 'yes' : 'no', 8) +
      c.project,
    );
  }
  console.log('');
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str + ' ' : str + ' '.repeat(len - str.length);
}
