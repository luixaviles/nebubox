import { getToolProfile } from '../config/tools.js';
import { buildImage, imageExists, getImageName } from '../docker/image.js';
import { ensureDocker, validateToolName } from '../utils/validation.js';
import * as log from '../utils/logger.js';

export interface BuildOptions {
  tool: string;
  noCache: boolean;
}

export async function buildCommand(opts: BuildOptions): Promise<void> {
  validateToolName(opts.tool);
  ensureDocker();

  const profile = getToolProfile(opts.tool)!;

  if (imageExists(profile.name)) {
    log.info(`Image ${getImageName(profile.name)} already exists. Rebuilding...`);
  }

  await buildImage(profile, opts.noCache);
}
