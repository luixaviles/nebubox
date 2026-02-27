import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const CLI = resolve(import.meta.dirname, '..', 'dist', 'index.js');

function run(...args: string[]): string {
  try {
    return execFileSync('node', [CLI, ...args], {
      encoding: 'utf-8',
      timeout: 5000,
    });
  } catch (err: any) {
    // CLI may exit non-zero; we still want stdout+stderr
    return (err.stdout ?? '') + (err.stderr ?? '');
  }
}

describe('unknown flag warnings', () => {
  it('warns about unknown flags', () => {
    const output = run('start', '.', '--tool', 'claude', '--badFlag');
    expect(output).toContain('Unknown flag');
    expect(output).toContain('--badFlag');
  });

  it('does not warn about known flags', () => {
    const output = run('--help');
    expect(output).not.toContain('Unknown flag');
  });

  it('does not warn about --rebuild', () => {
    // --rebuild is known, so no warning (will fail on Docker check but that's fine)
    const output = run('build', '--tool', 'claude', '--rebuild');
    expect(output).not.toContain('Unknown flag');
  });

  it('does not warn about --github', () => {
    const output = run('--help', '--github');
    expect(output).not.toContain('Unknown flag');
  });

  it('warns about --no-cache (replaced by --rebuild)', () => {
    const output = run('build', '--tool', 'claude', '--no-cache');
    expect(output).toContain('Unknown flag');
    expect(output).toContain('--no-cache');
  });

  it('warns about --recreate (replaced by --rebuild)', () => {
    const output = run('start', '.', '--tool', 'claude', '--recreate');
    expect(output).toContain('Unknown flag');
    expect(output).toContain('--recreate');
  });
});
