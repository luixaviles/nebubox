export const LABEL_MANAGED = 'nebubox.managed';
export const LABEL_TOOL = 'nebubox.tool';
export const LABEL_PROJECT = 'nebubox.project';
export const LABEL_PROJECT_PATH = 'nebubox.project-path';

export const IMAGE_PREFIX = 'nebubox-';
export const CONTAINER_PREFIX = 'nebubox-';

export const BASE_IMAGE = 'node:24-bookworm-slim';

export const BASE_PACKAGES = ['git', 'curl', 'ca-certificates', 'sudo'];

export const CODER_UID = 1000;
export const CODER_GID = 1000;
export const CODER_USER = 'coder';
export const CODER_HOME = '/home/coder';
export const WORKSPACE_DIR = '/home/coder/workspace';
