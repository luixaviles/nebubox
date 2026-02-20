const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

export function info(msg: string): void {
  console.log(`${CYAN}ℹ${RESET} ${msg}`);
}

export function success(msg: string): void {
  console.log(`${GREEN}✔${RESET} ${msg}`);
}

export function warn(msg: string): void {
  console.error(`${YELLOW}⚠${RESET} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${RED}✖${RESET} ${msg}`);
}

export function step(msg: string): void {
  console.log(`${DIM}→${RESET} ${msg}`);
}

export function hint(msg: string): void {
  console.log(`\n${BOLD}${CYAN}💡 ${msg}${RESET}\n`);
}

export function header(msg: string): void {
  console.log(`\n${BOLD}${msg}${RESET}`);
}
