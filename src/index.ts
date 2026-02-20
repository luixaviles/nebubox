#!/usr/bin/env node

import { getToolNames } from './config/tools.js';
import { startCommand } from './commands/start.js';
import { listCommand } from './commands/list.js';
import { stopCommand } from './commands/stop.js';
import { attachCommand } from './commands/attach.js';
import { removeCommand } from './commands/remove.js';
import { buildCommand } from './commands/build.js';
import { NebuboxError } from './utils/errors.js';
import * as log from './utils/logger.js';
import { promptToolSelection } from './utils/prompt.js';
import { parseArgs } from './utils/parse-args.js';

const VERSION = '0.1.0';
process.title = `nebubox v${VERSION}`;

function printHelp(): void {
  const tools = getToolNames().join(', ');
  console.log(`
nebubox v${VERSION}
Run AI coding CLI tools safely inside Docker containers.

USAGE
  nebubox <command> [options]

COMMANDS
  start <path> [--tool <name>] [--no-cache] [--recreate]   Create/start container and attach shell
  list [--tool <name>]           List managed containers
  stop <name>                    Stop a running container
  attach <name>                  Attach to a running container
  remove <name>                  Remove a container
  build [<tool>] [--tool <name>] [--no-cache]   Build (or rebuild) a tool's Docker image

OPTIONS
  --tool <name>    Tool to use (interactive prompt if omitted)
                   Available: ${tools}
  --no-cache       Skip Docker cache when building images
  --recreate       Remove and recreate existing container
  --help, -h       Show this help message
  --version, -v    Show version

EXAMPLES
  nebubox start ./my-project
  nebubox start ./my-project --tool gemini
  nebubox list
  nebubox list --tool claude
  nebubox stop nebubox-claude-my-project
  nebubox attach nebubox-claude-my-project
  nebubox remove nebubox-claude-my-project
  nebubox build --tool codex
`);
}

async function main(): Promise<void> {
  const { command, args, flags } = parseArgs(process.argv);

  if (flags['help'] || flags['h'] || command === 'help') {
    printHelp();
    return;
  }

  if (flags['version'] || flags['v'] || command === 'version') {
    console.log(`nebubox v${VERSION}`);
    return;
  }

  if (!command) {
    printHelp();
    process.exit(1);
  }

  try {
    switch (command) {
      case 'start': {
        const path = args[0];
        if (!path) {
          log.error('Missing required argument: <path>');
          log.info('Usage: nebubox start <path> [--tool <name>]');
          process.exit(1);
        }
        const startTool = flags['tool'] ?? await promptToolSelection();
        await startCommand({ path, tool: startTool, noCache: flags['no-cache'] === 'true', recreate: flags['recreate'] === 'true' });
        break;
      }

      case 'list': {
        listCommand({ tool: flags['tool'] });
        break;
      }

      case 'stop': {
        const name = args[0];
        if (!name) {
          log.error('Missing required argument: <name>');
          log.info('Usage: nebubox stop <name>');
          process.exit(1);
        }
        stopCommand(name);
        break;
      }

      case 'attach': {
        const name = args[0];
        if (!name) {
          log.error('Missing required argument: <name>');
          log.info('Usage: nebubox attach <name>');
          process.exit(1);
        }
        attachCommand(name);
        break;
      }

      case 'remove': {
        const name = args[0];
        if (!name) {
          log.error('Missing required argument: <name>');
          log.info('Usage: nebubox remove <name>');
          process.exit(1);
        }
        removeCommand(name);
        break;
      }

      case 'build': {
        const buildTool = args[0] ?? flags['tool'] ?? await promptToolSelection();
        await buildCommand({ tool: buildTool, noCache: flags['no-cache'] === 'true' });
        break;
      }

      default:
        log.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    if (err instanceof NebuboxError) {
      log.error(err.message);
      process.exit(1);
    }
    if (err instanceof Error) {
      log.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}

main();
