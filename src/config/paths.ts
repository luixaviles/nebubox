import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const NEBUBOX_DIR = '.nebubox';
const AUTH_DIR = 'auth';

export function getNebuboxHome(): string {
  return join(homedir(), NEBUBOX_DIR);
}

export function getAuthDir(toolName: string): string {
  return join(getNebuboxHome(), AUTH_DIR, toolName);
}

export function ensureAuthDir(toolName: string): string {
  const dir = getAuthDir(toolName);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getAuthFile(fileName: string): string {
  return join(getNebuboxHome(), AUTH_DIR, fileName);
}

export function ensureAuthFile(fileName: string): string {
  const filePath = getAuthFile(fileName);
  mkdirSync(join(getNebuboxHome(), AUTH_DIR), { recursive: true });
  if (!existsSync(filePath)) {
    writeFileSync(filePath, '{}');
  }
  return filePath;
}
