import * as readline from 'node:readline';
import { getToolNames, getToolProfile } from '../config/tools.js';

export function promptToolSelection(): Promise<string> {
  const tools = getToolNames();

  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('No --tool specified and stdin is not interactive. Use --tool <name> to specify a tool.'));
      return;
    }

    let selected = 0;

    const render = () => {
      // Move cursor up to overwrite previous render (except first render)
      if (rendered) {
        process.stdout.write(`\x1b[${tools.length}A`);
      }
      for (let i = 0; i < tools.length; i++) {
        const profile = getToolProfile(tools[i])!;
        const cursor = i === selected ? '\x1b[36m❯\x1b[0m' : ' ';
        const label = i === selected
          ? `\x1b[36m${profile.displayName}\x1b[0m`
          : `${profile.displayName}`;
        process.stdout.write(`${cursor} ${label}\x1b[K\n`);
      }
    };

    let rendered = false;
    console.log('\x1b[1mSelect a tool:\x1b[0m');
    render();
    rendered = true;

    const rl = readline.createInterface({ input: process.stdin, terminal: false });

    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onData = (key: Buffer) => {
      const str = key.toString();

      // Ctrl+C
      if (str === '\x03') {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        rl.close();
        process.exit(130);
      }

      // Up arrow or k
      if (str === '\x1b[A' || str === 'k') {
        selected = (selected - 1 + tools.length) % tools.length;
        render();
        return;
      }

      // Down arrow or j
      if (str === '\x1b[B' || str === 'j') {
        selected = (selected + 1) % tools.length;
        render();
        return;
      }

      // Enter
      if (str === '\r' || str === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        rl.close();
        resolve(tools[selected]);
        return;
      }
    };

    process.stdin.on('data', onData);
  });
}
