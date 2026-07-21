export function parseArgs(argv: string[]): {
  command: string;
  args: string[];
  flags: Record<string, string>;
  multiFlags: Record<string, string[]>;
} {
  const rawArgs = argv.slice(2);
  const positional: string[] = [];
  // `flags` keeps last-wins semantics for single-value flags (e.g. --tool).
  // `multiFlags` accumulates every occurrence so repeatable flags (e.g. --mount)
  // can supply multiple values.
  const flags: Record<string, string> = {};
  const multiFlags: Record<string, string[]> = {};

  const record = (key: string, value: string): void => {
    flags[key] = value;
    (multiFlags[key] ??= []).push(value);
  };

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rawArgs[i + 1];
      if (next && !next.startsWith('--')) {
        record(key, next);
        i++;
      } else {
        record(key, 'true');
      }
    } else {
      positional.push(arg);
    }
  }

  const command = positional[0] ?? '';
  const args = positional.slice(1);

  return { command, args, flags, multiFlags };
}
