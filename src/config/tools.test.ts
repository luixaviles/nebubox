import { describe, it, expect } from 'vitest';
import { TOOL_PROFILES, getToolProfile, getToolNames, type ToolProfile } from './tools.js';

describe('TOOL_PROFILES', () => {
  it('contains claude, gemini, and codex', () => {
    expect(Object.keys(TOOL_PROFILES)).toEqual(['claude', 'gemini', 'codex']);
  });

  it.each(Object.entries(TOOL_PROFILES))('%s has required fields', (_name, profile: ToolProfile) => {
    expect(profile.name).toBeTypeOf('string');
    expect(profile.displayName).toBeTypeOf('string');
    expect(Array.isArray(profile.packages)).toBe(true);
    expect(Array.isArray(profile.installCommands)).toBe(true);
    expect(profile.envVars).toBeTypeOf('object');
    expect(profile.authDir).toBeTypeOf('string');
    expect(Array.isArray(profile.authFiles)).toBe(true);
    expect(profile.hint).toBeTypeOf('string');
  });

  it.each(Object.entries(TOOL_PROFILES))('%s has at least one install command', (_name, profile: ToolProfile) => {
    expect(profile.installCommands.length).toBeGreaterThanOrEqual(1);
  });
});

describe('getToolProfile', () => {
  it('returns profile for known tool', () => {
    const profile = getToolProfile('claude');
    expect(profile).toBeDefined();
    expect(profile!.name).toBe('claude');
  });

  it('returns undefined for unknown tool', () => {
    expect(getToolProfile('unknown')).toBeUndefined();
  });
});

describe('getToolNames', () => {
  it('returns array of tool names', () => {
    const names = getToolNames();
    expect(names).toEqual(['claude', 'gemini', 'codex']);
  });

  it('returns a new array each time', () => {
    const a = getToolNames();
    const b = getToolNames();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
