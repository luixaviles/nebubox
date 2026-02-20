import { describe, it, expect } from 'vitest';
import { parseArgs } from './parse-args.js';

describe('parseArgs', () => {
  it('returns empty command and args for no arguments', () => {
    const result = parseArgs(['node', 'nebubox']);
    expect(result).toEqual({ command: '', args: [], flags: {} });
  });

  it('parses a single command', () => {
    const result = parseArgs(['node', 'nebubox', 'list']);
    expect(result.command).toBe('list');
    expect(result.args).toEqual([]);
  });

  it('parses command with positional args', () => {
    const result = parseArgs(['node', 'nebubox', 'start', './my-project']);
    expect(result.command).toBe('start');
    expect(result.args).toEqual(['./my-project']);
  });

  it('parses flags with values', () => {
    const result = parseArgs(['node', 'nebubox', 'start', './proj', '--tool', 'claude']);
    expect(result.flags).toEqual({ tool: 'claude' });
  });

  it('parses boolean flags (no value)', () => {
    const result = parseArgs(['node', 'nebubox', 'build', '--no-cache']);
    expect(result.flags['no-cache']).toBe('true');
  });

  it('parses mixed positional args and flags', () => {
    const result = parseArgs(['node', 'nebubox', 'start', './proj', '--tool', 'gemini', '--no-cache']);
    expect(result.command).toBe('start');
    expect(result.args).toEqual(['./proj']);
    expect(result.flags).toEqual({ tool: 'gemini', 'no-cache': 'true' });
  });

  it('treats flag followed by another flag as boolean', () => {
    const result = parseArgs(['node', 'nebubox', 'build', '--no-cache', '--tool', 'codex']);
    expect(result.flags['no-cache']).toBe('true');
    expect(result.flags['tool']).toBe('codex');
  });

  it('handles multiple positional args', () => {
    const result = parseArgs(['node', 'nebubox', 'start', 'a', 'b', 'c']);
    expect(result.command).toBe('start');
    expect(result.args).toEqual(['a', 'b', 'c']);
  });
});
