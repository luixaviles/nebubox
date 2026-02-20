export function parseArgs(argv: string[]): { command: string; args: string[]; flags: Record<string, string> } {
  const rawArgs = argv.slice(2);
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rawArgs[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }

  const command = positional[0] ?? '';
  const args = positional.slice(1);

  return { command, args, flags };
}
