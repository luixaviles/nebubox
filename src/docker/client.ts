import { spawnSync, spawn, type SpawnSyncReturns } from 'node:child_process';

export interface ExecResult {
  status: number;
  stdout: string;
  stderr: string;
}

export function dockerExec(args: string[]): ExecResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync('docker', args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout?.toString().trim() ?? '',
    stderr: result.stderr?.toString().trim() ?? '',
  };
}

export function dockerInteractive(args: string[]): number {
  const result = spawnSync('docker', args, {
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

export function dockerExecAsync(args: string[]): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    child.on('close', (code) => {
      resolve({
        status: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString().trim(),
        stderr: Buffer.concat(stderrChunks).toString().trim(),
      });
    });
  });
}
