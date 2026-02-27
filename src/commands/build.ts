import { getToolProfile } from '../config/tools.js';
import { buildImage, imageExists, getImageName } from '../docker/image.js';
import { ensureDocker, validateToolName } from '../utils/validation.js';
import * as log from '../utils/logger.js';

export interface BuildOptions {
  tool: string;
  rebuild: boolean;
  github: boolean;
}

export async function buildCommand(opts: BuildOptions): Promise<void> {
  validateToolName(opts.tool);
  ensureDocker();

  const profile = getToolProfile(opts.tool)!;

  const imageOpts = opts.github ? { github: true } : undefined;

  if (imageExists(profile.name, opts.github)) {
    log.info(`Image ${getImageName(profile.name, opts.github)} already exists. Rebuilding...`);
  }

  await buildImage(profile, opts.rebuild, imageOpts);
}
