import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./commands/start.js', () => ({ startCommand: vi.fn() }));
vi.mock('./commands/build.js', () => ({ buildCommand: vi.fn() }));
vi.mock('./commands/list.js', () => ({ listCommand: vi.fn() }));
vi.mock('./commands/stop.js', () => ({ stopCommand: vi.fn() }));
vi.mock('./commands/attach.js', () => ({ attachCommand: vi.fn() }));
vi.mock('./commands/remove.js', () => ({ removeCommand: vi.fn() }));
vi.mock('./utils/prompt.js', () => ({ promptToolSelection: vi.fn() }));

import { main } from './cli.js';
import * as log from './utils/logger.js';

describe('unknown flag warnings', () => {
  let savedArgv: string[];

  beforeEach(() => {
    savedArgv = process.argv;
    vi.spyOn(log, 'warn');
    vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    process.argv = savedArgv;
    vi.restoreAllMocks();
  });

  it('warns about unknown flags', async () => {
    process.argv = ['node', 'nebubox', 'start', '.', '--tool', 'claude', '--badFlag'];
    await main();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown flag'));
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('--badFlag'));
  });

  it('does not warn about known flags', async () => {
    process.argv = ['node', 'nebubox', '--help'];
    await main();
    expect(log.warn).not.toHaveBeenCalledWith(expect.stringContaining('Unknown flag'));
  });

  it('does not warn about --rebuild', async () => {
    process.argv = ['node', 'nebubox', 'build', '--tool', 'claude', '--rebuild'];
    await main();
    expect(log.warn).not.toHaveBeenCalledWith(expect.stringContaining('Unknown flag'));
  });

  it('does not warn about --github', async () => {
    process.argv = ['node', 'nebubox', '--help', '--github'];
    await main();
    expect(log.warn).not.toHaveBeenCalledWith(expect.stringContaining('Unknown flag'));
  });

  it('warns about --no-cache (replaced by --rebuild)', async () => {
    process.argv = ['node', 'nebubox', 'build', '--tool', 'claude', '--no-cache'];
    await main();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown flag'));
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('--no-cache'));
  });

  it('warns about --recreate (replaced by --rebuild)', async () => {
    process.argv = ['node', 'nebubox', 'start', '.', '--tool', 'claude', '--recreate'];
    await main();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown flag'));
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('--recreate'));
  });
});
