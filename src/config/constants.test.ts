import { describe, it, expect } from 'vitest';
import {
  LABEL_MANAGED,
  LABEL_TOOL,
  LABEL_PROJECT,
  LABEL_PROJECT_PATH,
  IMAGE_PREFIX,
  CONTAINER_PREFIX,
  BASE_IMAGE,
  BASE_PACKAGES,
  CODER_UID,
  CODER_GID,
  CODER_USER,
  CODER_HOME,
  WORKSPACE_DIR,
} from './constants.js';

describe('constants', () => {
  it('has correct label values', () => {
    expect(LABEL_MANAGED).toBe('nebubox.managed');
    expect(LABEL_TOOL).toBe('nebubox.tool');
    expect(LABEL_PROJECT).toBe('nebubox.project');
    expect(LABEL_PROJECT_PATH).toBe('nebubox.project-path');
  });

  it('has correct prefixes', () => {
    expect(IMAGE_PREFIX).toBe('nebubox-');
    expect(CONTAINER_PREFIX).toBe('nebubox-');
  });

  it('has a base image', () => {
    expect(BASE_IMAGE).toMatch(/^node:/);
  });

  it('includes required base packages', () => {
    expect(BASE_PACKAGES).toContain('git');
    expect(BASE_PACKAGES).toContain('curl');
    expect(BASE_PACKAGES).toContain('sudo');
  });

  it('has correct user constants', () => {
    expect(CODER_UID).toBe(1000);
    expect(CODER_GID).toBe(1000);
    expect(CODER_USER).toBe('coder');
    expect(CODER_HOME).toBe('/home/coder');
    expect(WORKSPACE_DIR).toBe('/home/coder/workspace');
  });
});
