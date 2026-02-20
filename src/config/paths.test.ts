import { describe, it, expect } from 'vitest';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withIsolatedHome } from '../../test/test-env.js';
import {
  getNebuboxHome,
  getAuthDir,
  ensureAuthDir,
  getAuthFile,
  ensureAuthFile,
} from './paths.js';

describe('getNebuboxHome', () => {
  it('returns $HOME/.nebubox', () => {
    withIsolatedHome((home) => {
      expect(getNebuboxHome()).toBe(join(home, '.nebubox'));
    });
  });
});

describe('getAuthDir', () => {
  it('returns nested auth directory path', () => {
    withIsolatedHome((home) => {
      expect(getAuthDir('claude')).toBe(join(home, '.nebubox', 'auth', 'claude'));
    });
  });
});

describe('ensureAuthDir', () => {
  it('creates the directory structure', () => {
    withIsolatedHome(() => {
      const dir = ensureAuthDir('claude');
      expect(existsSync(dir)).toBe(true);
      expect(statSync(dir).isDirectory()).toBe(true);
    });
  });

  it('is idempotent', () => {
    withIsolatedHome(() => {
      const first = ensureAuthDir('gemini');
      const second = ensureAuthDir('gemini');
      expect(first).toBe(second);
      expect(existsSync(first)).toBe(true);
    });
  });
});

describe('getAuthFile', () => {
  it('returns file path under auth dir', () => {
    withIsolatedHome((home) => {
      expect(getAuthFile('.claude.json')).toBe(join(home, '.nebubox', 'auth', '.claude.json'));
    });
  });
});

describe('ensureAuthFile', () => {
  it('creates the file with empty JSON if it does not exist', () => {
    withIsolatedHome(() => {
      const filePath = ensureAuthFile('.claude.json');
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, 'utf-8')).toBe('{}');
    });
  });

  it('does not overwrite existing file', () => {
    withIsolatedHome(() => {
      const filePath = ensureAuthFile('test.json');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toBe('{}');
      // Call again — should not overwrite
      const filePath2 = ensureAuthFile('test.json');
      expect(filePath2).toBe(filePath);
      expect(readFileSync(filePath2, 'utf-8')).toBe('{}');
    });
  });
});
