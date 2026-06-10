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
import { startCommand } from './commands/start.js';
import { listCommand } from './commands/list.js';
import { stopCommand } from './commands/stop.js';
import { attachCommand } from './commands/attach.js';
import { removeCommand } from './commands/remove.js';
import { buildCommand } from './commands/build.js';
import { promptToolSelection } from './utils/prompt.js';

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

  it('does not warn about --pnpm', async () => {
    process.argv = ['node', 'nebubox', '--help', '--pnpm'];
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

describe('flags and errors', () => {
  let savedArgv: string[];
  let logSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    savedArgv = process.argv;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    process.argv = savedArgv;
    vi.restoreAllMocks();
  });

  it('prints help when --help is provided', async () => {
    process.argv = ['node', 'nebubox', '--help'];
    await main();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('USAGE'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('COMMANDS'));
  });

  it('prints help when --h is provided', async () => {
    process.argv = ['node', 'nebubox', '--h'];
    await main();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('USAGE'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('COMMANDS'));
  });

  it('prints help when help command is provided', async () => {
    process.argv = ['node', 'nebubox', 'help'];
    await main();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('USAGE'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('COMMANDS'));
  });

  it('prints version when --version is provided', async () => {
    process.argv = ['node', 'nebubox', '--version'];
    await main();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('nebubox v'));
  });

  it('prints version when --v is provided', async () => {
    process.argv = ['node', 'nebubox', '--v'];
    await main();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('nebubox v'));
  });

  it('prints version when version command is provided', async () => {
    process.argv = ['node', 'nebubox', 'version'];
    await main();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('nebubox v'));
  });

  it('exits with code 1 and prints help when no command is provided', async () => {
    process.argv = ['node', 'nebubox'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('USAGE'));
  });

  it('logs error message and exits with 1 when a command handler throws NebuboxError', async () => {
    const { startCommand } = await import('./commands/start.js');
    const { NebuboxError } = await import('./utils/errors.js');
    vi.mocked(startCommand).mockRejectedValueOnce(new NebuboxError('Custom Nebubox error'));

    process.argv = ['node', 'nebubox', 'start', 'some-path', '--tool', 'claude'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(errorSpy).toHaveBeenCalledWith('Custom Nebubox error');
  });

  it('logs error message and exits with 1 when a command handler throws generic Error', async () => {
    const { startCommand } = await import('./commands/start.js');
    vi.mocked(startCommand).mockRejectedValueOnce(new Error('Some generic error'));

    process.argv = ['node', 'nebubox', 'start', 'some-path', '--tool', 'claude'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(errorSpy).toHaveBeenCalledWith('Some generic error');
  });

  it('rethrows when a command handler rejects with a non-Error object', async () => {
    const { startCommand } = await import('./commands/start.js');
    vi.mocked(startCommand).mockRejectedValueOnce('string rejection');

    process.argv = ['node', 'nebubox', 'start', 'some-path', '--tool', 'claude'];
    await expect(main()).rejects.toBe('string rejection');
  });

  it('exits with code 1 when start command path is missing', async () => {
    process.argv = ['node', 'nebubox', 'start'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(errorSpy).toHaveBeenCalledWith('Missing required argument: <path>');
  });

  it('exits with code 1 when stop command name is missing', async () => {
    process.argv = ['node', 'nebubox', 'stop'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(errorSpy).toHaveBeenCalledWith('Missing required argument: <name>');
  });

  it('exits with code 1 when attach command name is missing', async () => {
    process.argv = ['node', 'nebubox', 'attach'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(errorSpy).toHaveBeenCalledWith('Missing required argument: <name>');
  });

  it('exits with code 1 when remove command name is missing', async () => {
    process.argv = ['node', 'nebubox', 'remove'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(errorSpy).toHaveBeenCalledWith('Missing required argument: <name>');
  });

  it('exits with code 1 when unknown command is provided', async () => {
    process.argv = ['node', 'nebubox', 'unknown-cmd'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(errorSpy).toHaveBeenCalledWith('Unknown command: unknown-cmd');
  });
});

describe('command routing', () => {
  let savedArgv: string[];

  beforeEach(() => {
    savedArgv = process.argv;
    vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    process.argv = savedArgv;
    vi.clearAllMocks();
  });

  it('routes to start command with correct argument mappings', async () => {
    process.argv = [
      'node',
      'nebubox',
      'start',
      './my-project',
      '--tool',
      'claude',
      '--rebuild',
      '--github',
      '--pnpm',
    ];
    await main();
    expect(startCommand).toHaveBeenCalledTimes(1);
    expect(startCommand).toHaveBeenCalledWith({
      path: './my-project',
      tool: 'claude',
      rebuild: true,
      github: true,
      pnpm: true,
    });
  });

  it('routes to start command with prompt tool selection when tool flag is omitted', async () => {
    vi.mocked(promptToolSelection).mockResolvedValueOnce('gemini');
    process.argv = ['node', 'nebubox', 'start', './my-project'];
    await main();
    expect(promptToolSelection).toHaveBeenCalledTimes(1);
    expect(startCommand).toHaveBeenCalledTimes(1);
    expect(startCommand).toHaveBeenCalledWith({
      path: './my-project',
      tool: 'gemini',
      rebuild: false,
      github: false,
      pnpm: false,
    });
  });

  it('routes to list command with correct tool parameter', async () => {
    process.argv = ['node', 'nebubox', 'list', '--tool', 'claude'];
    await main();
    expect(listCommand).toHaveBeenCalledTimes(1);
    expect(listCommand).toHaveBeenCalledWith({ tool: 'claude' });
  });

  it('routes to list command without tool parameter', async () => {
    process.argv = ['node', 'nebubox', 'list'];
    await main();
    expect(listCommand).toHaveBeenCalledTimes(1);
    expect(listCommand).toHaveBeenCalledWith({ tool: undefined });
  });

  it('routes to stop command with correct name argument', async () => {
    process.argv = ['node', 'nebubox', 'stop', 'my-container'];
    await main();
    expect(stopCommand).toHaveBeenCalledTimes(1);
    expect(stopCommand).toHaveBeenCalledWith('my-container');
  });

  it('routes to attach command with correct name argument', async () => {
    process.argv = ['node', 'nebubox', 'attach', 'my-container'];
    await main();
    expect(attachCommand).toHaveBeenCalledTimes(1);
    expect(attachCommand).toHaveBeenCalledWith('my-container');
  });

  it('routes to remove command with correct name argument', async () => {
    process.argv = ['node', 'nebubox', 'remove', 'my-container'];
    await main();
    expect(removeCommand).toHaveBeenCalledTimes(1);
    expect(removeCommand).toHaveBeenCalledWith('my-container');
  });

  it('routes to build command with positional tool and all flags', async () => {
    process.argv = [
      'node',
      'nebubox',
      'build',
      'claude',
      '--rebuild',
      '--github',
      '--pnpm',
    ];
    await main();
    expect(buildCommand).toHaveBeenCalledTimes(1);
    expect(buildCommand).toHaveBeenCalledWith({
      tool: 'claude',
      rebuild: true,
      github: true,
      pnpm: true,
    });
  });

  it('routes to build command with tool flag', async () => {
    process.argv = ['node', 'nebubox', 'build', '--tool', 'gemini'];
    await main();
    expect(buildCommand).toHaveBeenCalledTimes(1);
    expect(buildCommand).toHaveBeenCalledWith({
      tool: 'gemini',
      rebuild: false,
      github: false,
      pnpm: false,
    });
  });

  it('routes to build command with prompt tool selection when tool is omitted', async () => {
    vi.mocked(promptToolSelection).mockResolvedValueOnce('antigravity');
    process.argv = ['node', 'nebubox', 'build'];
    await main();
    expect(promptToolSelection).toHaveBeenCalledTimes(1);
    expect(buildCommand).toHaveBeenCalledTimes(1);
    expect(buildCommand).toHaveBeenCalledWith({
      tool: 'antigravity',
      rebuild: false,
      github: false,
      pnpm: false,
    });
  });
});

