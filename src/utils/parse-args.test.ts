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
    const result = parseArgs(['node', 'nebubox', 'build', '--rebuild']);
    expect(result.flags['rebuild']).toBe('true');
  });

  it('parses mixed positional args and flags', () => {
    const result = parseArgs(['node', 'nebubox', 'start', './proj', '--tool', 'gemini', '--rebuild']);
    expect(result.command).toBe('start');
    expect(result.args).toEqual(['./proj']);
    expect(result.flags).toEqual({ tool: 'gemini', 'rebuild': 'true' });
  });

  it('treats flag followed by another flag as boolean', () => {
    const result = parseArgs(['node', 'nebubox', 'build', '--rebuild', '--tool', 'codex']);
    expect(result.flags['rebuild']).toBe('true');
    expect(result.flags['tool']).toBe('codex');
  });

  it('handles multiple positional args', () => {
    const result = parseArgs(['node', 'nebubox', 'start', 'a', 'b', 'c']);
    expect(result.command).toBe('start');
    expect(result.args).toEqual(['a', 'b', 'c']);
  });

  it('parses --github as a boolean flag', () => {
    const result = parseArgs(['node', 'nebubox', 'start', './proj', '--tool', 'claude', '--github']);
    expect(result.flags['github']).toBe('true');
  });

  it('parses --github alongside other flags', () => {
    const result = parseArgs(['node', 'nebubox', 'start', './proj', '--github', '--rebuild', '--tool', 'claude']);
    expect(result.flags['github']).toBe('true');
    expect(result.flags['rebuild']).toBe('true');
    expect(result.flags['tool']).toBe('claude');
  });
});
