import { describe, it, expect, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
  spawn: vi.fn(),
}));

import { spawnSync, spawn } from 'node:child_process';
import { dockerExec, dockerInteractive, dockerExecAsync } from './client.js';

describe('dockerExec', () => {
  it('calls spawnSync with docker and provided args', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: Buffer.from('output\n'),
      stderr: Buffer.from(''),
      pid: 1,
      output: [],
      signal: null,
    });

    const result = dockerExec(['ps', '-a']);
    expect(spawnSync).toHaveBeenCalledWith('docker', ['ps', '-a'], expect.objectContaining({
      stdio: ['pipe', 'pipe', 'pipe'],
    }));
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('output');
    expect(result.stderr).toBe('');
  });

  it('returns status 1 when status is null', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: null,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      pid: 1,
      output: [],
      signal: 'SIGTERM',
    });

    const result = dockerExec(['info']);
    expect(result.status).toBe(1);
  });

  it('trims stdout and stderr', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: Buffer.from('  hello  \n'),
      stderr: Buffer.from('  warn  \n'),
      pid: 1,
      output: [],
      signal: null,
    });

    const result = dockerExec(['version']);
    expect(result.stdout).toBe('hello');
    expect(result.stderr).toBe('warn');
  });
});

describe('dockerInteractive', () => {
  it('calls spawnSync with inherited stdio', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      pid: 1,
      output: [],
      signal: null,
    });

    const code = dockerInteractive(['exec', '-it', 'mycontainer', '/bin/bash']);
    expect(spawnSync).toHaveBeenCalledWith('docker', ['exec', '-it', 'mycontainer', '/bin/bash'], {
      stdio: 'inherit',
    });
    expect(code).toBe(0);
  });

  it('returns 1 when status is null', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: null,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      pid: 1,
      output: [],
      signal: 'SIGTERM',
    });

    expect(dockerInteractive(['exec', '-it', 'c', 'bash'])).toBe(1);
  });
});

describe('dockerExecAsync', () => {
  it('resolves with stdout and stderr', async () => {
    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    };

    vi.mocked(spawn).mockReturnValue(mockChild as any);

    const promise = dockerExecAsync(['build', '-t', 'test', '.']);

    // Simulate data events
    const stdoutCb = mockChild.stdout.on.mock.calls.find((c: any[]) => c[0] === 'data')![1];
    const stderrCb = mockChild.stderr.on.mock.calls.find((c: any[]) => c[0] === 'data')![1];
    const closeCb = mockChild.on.mock.calls.find((c: any[]) => c[0] === 'close')![1];

    stdoutCb(Buffer.from('built ok'));
    stderrCb(Buffer.from('warning'));
    closeCb(0);

    const result = await promise;
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('built ok');
    expect(result.stderr).toBe('warning');
  });

  it('resolves with status 1 when code is null', async () => {
    const mockChild = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    };

    vi.mocked(spawn).mockReturnValue(mockChild as any);

    const promise = dockerExecAsync(['info']);

    const closeCb = mockChild.on.mock.calls.find((c: any[]) => c[0] === 'close')![1];
    closeCb(null);

    const result = await promise;
    expect(result.status).toBe(1);
  });
});
