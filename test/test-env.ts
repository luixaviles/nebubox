import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Creates an isolated temporary HOME directory for tests that touch
 * the filesystem (e.g. getNebuboxHome, ensureAuthDir). Sets $HOME
 * to the temp dir before the callback and restores it after.
 */
export function withIsolatedHome(fn: (home: string) => void): void {
  const original = process.env['HOME'];
  const tempHome = mkdtempSync(join(tmpdir(), 'nebubox-test-'));

  try {
    process.env['HOME'] = tempHome;
    fn(tempHome);
  } finally {
    process.env['HOME'] = original;
    rmSync(tempHome, { recursive: true, force: true });
  }
}
