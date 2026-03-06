import { getToolProfile } from '../config/tools.js';
import { buildImage, imageExists, getImageName, type ImageOptions } from '../docker/image.js';
import { ensureDocker, validateToolName } from '../utils/validation.js';
import * as log from '../utils/logger.js';

export interface BuildOptions {
  tool: string;
  rebuild: boolean;
  github: boolean;
  pnpm: boolean;
}

export async function buildCommand(opts: BuildOptions): Promise<void> {
  validateToolName(opts.tool);
  ensureDocker();

  const profile = getToolProfile(opts.tool)!;

  const imageOpts: ImageOptions = {};
  if (opts.github) imageOpts.github = true;
  if (opts.pnpm) imageOpts.pnpm = true;

  if (imageExists(profile.name, imageOpts)) {
    log.info(`Image ${getImageName(profile.name, imageOpts)} already exists. Rebuilding...`);
  }

  await buildImage(profile, opts.rebuild, imageOpts);
}
