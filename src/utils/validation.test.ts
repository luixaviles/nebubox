import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateProjectPath, validateToolName, ensureDocker } from './validation.js';
import { ValidationError, DockerNotFoundError } from './errors.js';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from 'node:child_process';

describe('validateProjectPath', () => {
  it('returns resolved path for existing directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nebubox-vp-'));
    const result = validateProjectPath(dir);
    expect(result).toBe(dir);
  });

  it('throws ValidationError for non-existent path', () => {
    expect(() => validateProjectPath('/does/not/exist')).toThrow(ValidationError);
  });

  it('throws ValidationError for a file (not a directory)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nebubox-vp-'));
    const filePath = join(dir, 'file.txt');
    writeFileSync(filePath, 'content');
    expect(() => validateProjectPath(filePath)).toThrow(ValidationError);
  });
});

describe('validateToolName', () => {
  it('does not throw for valid tool names', () => {
    expect(() => validateToolName('claude')).not.toThrow();
    expect(() => validateToolName('gemini')).not.toThrow();
    expect(() => validateToolName('codex')).not.toThrow();
  });

  it('throws ValidationError for unknown tool', () => {
    expect(() => validateToolName('unknown')).toThrow(ValidationError);
    expect(() => validateToolName('')).toThrow(ValidationError);
  });

  it('includes available tools in error message', () => {
    try {
      validateToolName('bad');
    } catch (e) {
      expect((e as Error).message).toContain('claude');
      expect((e as Error).message).toContain('gemini');
      expect((e as Error).message).toContain('codex');
    }
  });
});

describe('ensureDocker', () => {
  it('does not throw when docker info succeeds', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      pid: 1,
      output: [],
      signal: null,
    });
    expect(() => ensureDocker()).not.toThrow();
  });

  it('throws DockerNotFoundError when docker info fails', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 1,
      stdout: Buffer.from(''),
      stderr: Buffer.from('Cannot connect'),
      pid: 1,
      output: [],
      signal: null,
    });
    expect(() => ensureDocker()).toThrow(DockerNotFoundError);
  });
});
