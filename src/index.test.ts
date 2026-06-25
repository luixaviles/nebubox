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

describe('main CLI functionality', () => {
  let savedArgv: string[];

  beforeEach(() => {
    savedArgv = process.argv;
    vi.spyOn(log, 'error').mockImplementation(() => {});
    vi.spyOn(log, 'info').mockImplementation(() => {});
    vi.spyOn(log, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    process.argv = savedArgv;
    vi.restoreAllMocks();
  });

  it('prints help when --help, -h, or command help is provided', async () => {
    process.argv = ['node', 'nebubox', '--help'];
    await main();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Run AI coding CLI tools safely inside Docker containers'));

    process.argv = ['node', 'nebubox', '-h'];
    await main();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Run AI coding CLI tools safely inside Docker containers'));

    process.argv = ['node', 'nebubox', 'help'];
    await main();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Run AI coding CLI tools safely inside Docker containers'));
  });

  it('prints version when --version, -v, or command version is provided', async () => {
    process.argv = ['node', 'nebubox', '--version'];
    await main();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('nebubox v'));

    process.argv = ['node', 'nebubox', '-v'];
    await main();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('nebubox v'));

    process.argv = ['node', 'nebubox', 'version'];
    await main();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('nebubox v'));
  });

  it('prints help and exits with 1 when no command is provided', async () => {
    process.argv = ['node', 'nebubox'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Run AI coding CLI tools safely inside Docker containers'));
  });

  it('fails to start when path is missing', async () => {
    process.argv = ['node', 'nebubox', 'start'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(log.error).toHaveBeenCalledWith('Missing required argument: <path>');
  });

  it('starts command with path and flags', async () => {
    const { startCommand } = await import('./commands/start.js');
    process.argv = ['node', 'nebubox', 'start', './my-path', '--tool', 'claude', '--rebuild', 'true', '--github', 'true', '--pnpm', 'true', '--playwright', 'true'];
    await main();
    expect(startCommand).toHaveBeenCalledWith({
      path: './my-path',
      tool: 'claude',
      rebuild: true,
      github: true,
      pnpm: true,
      playwright: true,
    });
  });

  it('starts command and prompts for tool if tool flag is missing', async () => {
    const { startCommand } = await import('./commands/start.js');
    const { promptToolSelection } = await import('./utils/prompt.js');
    vi.mocked(promptToolSelection).mockResolvedValue('claude');
    process.argv = ['node', 'nebubox', 'start', './my-path'];
    await main();
    expect(promptToolSelection).toHaveBeenCalled();
    expect(startCommand).toHaveBeenCalledWith({
      path: './my-path',
      tool: 'claude',
      rebuild: false,
      github: false,
      pnpm: false,
      playwright: false,
    });
  });

  it('lists containers', async () => {
    const { listCommand } = await import('./commands/list.js');
    process.argv = ['node', 'nebubox', 'list', '--tool', 'claude'];
    await main();
    expect(listCommand).toHaveBeenCalledWith({ tool: 'claude' });
  });

  it('fails to stop when name is missing', async () => {
    process.argv = ['node', 'nebubox', 'stop'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(log.error).toHaveBeenCalledWith('Missing required argument: <name>');
  });

  it('stops command when name is provided', async () => {
    const { stopCommand } = await import('./commands/stop.js');
    process.argv = ['node', 'nebubox', 'stop', 'my-container'];
    await main();
    expect(stopCommand).toHaveBeenCalledWith('my-container');
  });

  it('fails to attach when name is missing', async () => {
    process.argv = ['node', 'nebubox', 'attach'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(log.error).toHaveBeenCalledWith('Missing required argument: <name>');
  });

  it('attaches command when name is provided', async () => {
    const { attachCommand } = await import('./commands/attach.js');
    process.argv = ['node', 'nebubox', 'attach', 'my-container'];
    await main();
    expect(attachCommand).toHaveBeenCalledWith('my-container');
  });

  it('fails to remove when name is missing', async () => {
    process.argv = ['node', 'nebubox', 'remove'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(log.error).toHaveBeenCalledWith('Missing required argument: <name>');
  });

  it('removes command when name is provided', async () => {
    const { removeCommand } = await import('./commands/remove.js');
    process.argv = ['node', 'nebubox', 'remove', 'my-container'];
    await main();
    expect(removeCommand).toHaveBeenCalledWith('my-container');
  });

  it('builds command with tool and flags', async () => {
    const { buildCommand } = await import('./commands/build.js');
    process.argv = ['node', 'nebubox', 'build', 'claude', '--rebuild', 'true', '--github', 'true', '--pnpm', 'true', '--playwright', 'true'];
    await main();
    expect(buildCommand).toHaveBeenCalledWith({
      tool: 'claude',
      rebuild: true,
      github: true,
      pnpm: true,
      playwright: true,
    });
  });

  it('builds command and prompts for tool if missing', async () => {
    const { buildCommand } = await import('./commands/build.js');
    const { promptToolSelection } = await import('./utils/prompt.js');
    vi.mocked(promptToolSelection).mockResolvedValue('claude');
    process.argv = ['node', 'nebubox', 'build'];
    await main();
    expect(promptToolSelection).toHaveBeenCalled();
    expect(buildCommand).toHaveBeenCalledWith({
      tool: 'claude',
      rebuild: false,
      github: false,
      pnpm: false,
      playwright: false,
    });
  });

  it('fails on unknown command', async () => {
    process.argv = ['node', 'nebubox', 'unknown-cmd'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(log.error).toHaveBeenCalledWith('Unknown command: unknown-cmd');
  });

  it('exits with error message when NebuboxError is thrown', async () => {
    const { startCommand } = await import('./commands/start.js');
    const { NebuboxError } = await import('./utils/errors.js');
    vi.mocked(startCommand).mockRejectedValue(new NebuboxError('Some Nebubox error'));
    process.argv = ['node', 'nebubox', 'start', './my-path', '--tool', 'claude'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(log.error).toHaveBeenCalledWith('Some Nebubox error');
  });

  it('exits with error message when generic Error is thrown', async () => {
    const { startCommand } = await import('./commands/start.js');
    vi.mocked(startCommand).mockRejectedValue(new Error('Some generic error'));
    process.argv = ['node', 'nebubox', 'start', './my-path', '--tool', 'claude'];
    await expect(main()).rejects.toThrow('process.exit(1)');
    expect(log.error).toHaveBeenCalledWith('Some generic error');
  });

  it('throws unexpected non-error objects', async () => {
    const { startCommand } = await import('./commands/start.js');
    vi.mocked(startCommand).mockRejectedValue('unexpected string error');
    process.argv = ['node', 'nebubox', 'start', './my-path', '--tool', 'claude'];
    await expect(main()).rejects.toThrow('unexpected string error');
  });
});

