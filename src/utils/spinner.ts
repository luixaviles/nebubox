const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const INTERVAL_MS = 80;

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const CLEAR_LINE = '\r\x1b[2K';

export class Spinner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;
  private message = '';
  private isTTY: boolean;

  constructor() {
    this.isTTY = process.stdout.isTTY === true;
  }

  start(message: string): void {
    this.message = message;
    this.frameIndex = 0;

    if (!this.isTTY) {
      process.stdout.write(`→ ${message}\n`);
      return;
    }

    process.stdout.write(HIDE_CURSOR);
    this.render();

    this.timer = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % FRAMES.length;
      this.render();
    }, INTERVAL_MS);

    process.once('exit', this.cleanup);
  }

  stop(finalMessage: string, success = true): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    process.removeListener('exit', this.cleanup);

    if (this.isTTY) {
      const icon = success ? `${GREEN}✔${RESET}` : `${RED}✖${RESET}`;
      process.stdout.write(`${CLEAR_LINE}${icon} ${finalMessage}\n`);
      process.stdout.write(SHOW_CURSOR);
    } else {
      const prefix = success ? '✔' : '✖';
      process.stdout.write(`${prefix} ${finalMessage}\n`);
    }
  }

  private render(): void {
    const frame = FRAMES[this.frameIndex];
    process.stdout.write(`${CLEAR_LINE}${CYAN}${frame}${RESET} ${this.message}`);
  }

  private cleanup = (): void => {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.isTTY) {
      process.stdout.write(SHOW_CURSOR);
    }
  };
}
