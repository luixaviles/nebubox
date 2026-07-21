import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateProjectPath, validateToolName, validateMount, ensureDocker } from './validation.js';
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
    expect(() => validateToolName('antigravity')).not.toThrow();
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
      expect((e as Error).message).toContain('antigravity');
    }
  });
});

describe('validateMount', () => {
  it('defaults the container path to /home/coder/workspace/<basename> when only a host is given', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nebubox-vm-'));
    expect(validateMount(dir)).toBe(`${dir}:/home/coder/workspace/${basename(dir)}`);
  });

  it('treats a lone ro/rw second segment as the mode, keeping the default destination', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nebubox-vm-'));
    expect(validateMount(`${dir}:ro`)).toBe(`${dir}:/home/coder/workspace/${basename(dir)}:ro`);
    expect(validateMount(`${dir}:rw`)).toBe(`${dir}:/home/coder/workspace/${basename(dir)}:rw`);
  });

  it('places a relative destination under /home/coder/workspace (rename shorthand)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nebubox-vm-'));
    const file = join(dir, 'secrets.env');
    writeFileSync(file, 'x');
    expect(validateMount(`${file}:renamed.env`)).toBe(`${file}:/home/coder/workspace/renamed.env`);
    expect(validateMount(`${file}:renamed.env:ro`)).toBe(`${file}:/home/coder/workspace/renamed.env:ro`);
  });

  it('uses an absolute destination verbatim', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nebubox-vm-'));
    expect(validateMount(`${dir}:/opt/data`)).toBe(`${dir}:/opt/data`);
    expect(validateMount(`${dir}:/home/coder/data:ro`)).toBe(`${dir}:/home/coder/data:ro`);
  });

  it('resolves a relative host path to absolute', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nebubox-vm-'));
    const result = validateMount(`${dir}:/home/coder/data`);
    expect(result.startsWith('/')).toBe(true);
  });

  it('accepts an existing host file (not just directories)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nebubox-vm-'));
    const file = join(dir, 'creds.json');
    writeFileSync(file, '{}');
    expect(validateMount(`${file}:ro`)).toBe(`${file}:/home/coder/workspace/creds.json:ro`);
  });

  it('throws when there are too many segments', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nebubox-vm-'));
    expect(() => validateMount(`${dir}:/home/coder/data:ro:extra`)).toThrow(ValidationError);
  });

  it('throws for an invalid mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nebubox-vm-'));
    expect(() => validateMount(`${dir}:/home/coder/data:readonly`)).toThrow(ValidationError);
  });

  it('throws for an empty spec (missing host path)', () => {
    expect(() => validateMount('')).toThrow(ValidationError);
  });

  it('throws when the host path does not exist', () => {
    expect(() => validateMount('/does/not/exist:/home/coder/data')).toThrow(ValidationError);
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
