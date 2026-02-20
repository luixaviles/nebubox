export interface ToolProfile {
  name: string;
  displayName: string;
  packages: string[];
  installCommands: string[];
  envVars: Record<string, string>;
  authDir: string;
  authFiles: string[];
  hint: string;
}

const claude: ToolProfile = {
  name: 'claude',
  displayName: 'Claude Code',
  packages: [],
  installCommands: [
    'curl -fsSL https://claude.ai/install.sh | bash',
  ],
  envVars: {
    PATH: '/home/coder/.local/bin:$PATH',
    // Stores all config (.claude.json, .credentials.json) in the mounted authDir,
    // avoiding Docker file bind-mount issues with atomic writes.
    // See: https://github.com/anthropics/claude-code/issues/1736
    CLAUDE_CONFIG_DIR: '/home/coder/.claude',
  },
  authDir: '.claude',
  authFiles: [],
  hint: 'Run `claude --dangerously-skip-permissions` to start Claude Code.',
};

const gemini: ToolProfile = {
  name: 'gemini',
  displayName: 'Gemini CLI',
  packages: [],
  installCommands: [
    'npm install -g @google/gemini-cli',
  ],
  envVars: {},
  authDir: '.gemini',
  authFiles: [],
  hint: 'Run `gemini --approval-mode=yolo --sandbox=false` to start Gemini CLI.',
};

const codex: ToolProfile = {
  name: 'codex',
  displayName: 'Codex CLI',
  packages: [],
  installCommands: [
    'npm install -g @openai/codex',
  ],
  envVars: {},
  authDir: '.codex',
  authFiles: [],
  hint: 'Run `codex --dangerously-bypass-approvals-and-sandbox` to start Codex CLI.',
};

export const TOOL_PROFILES: Record<string, ToolProfile> = {
  claude,
  gemini,
  codex,
};

export function getToolProfile(name: string): ToolProfile | undefined {
  return TOOL_PROFILES[name];
}

export function getToolNames(): string[] {
  return Object.keys(TOOL_PROFILES);
}
