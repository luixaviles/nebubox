export interface ToolProfile {
  name: string;
  displayName: string;
  packages: string[];
  installCommands: string[];
  envVars: Record<string, string>;
  authDir: string;
  authFiles: string[];
  hint: string;
  warning?: string;
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

const copilot: ToolProfile = {
  name: 'copilot',
  displayName: 'GitHub Copilot CLI',
  packages: [],
  installCommands: [
    'curl -fsSL https://gh.io/copilot-install | bash',
  ],
  envVars: {
    PATH: '/home/coder/.local/bin:$PATH',
    COPILOT_HOME: '/home/coder/.copilot',
  },
  authDir: '.copilot',
  authFiles: [],
  hint: 'Run `copilot --yolo` to start GitHub Copilot CLI. On first login, select "Yes, store in plain text" when prompted.',
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

const antigravity: ToolProfile = {
  name: 'antigravity',
  displayName: 'Antigravity CLI',
  packages: [],
  installCommands: [
    'curl -fsSL https://antigravity.google/cli/install.sh | bash',
  ],
  envVars: {
    PATH: '/home/coder/.local/bin:$PATH',
  },
  authDir: '.gemini',
  authFiles: [],
  hint: 'Run `agy --dangerously-skip-permissions` to start Antigravity CLI.',
};

export const TOOL_PROFILES: Record<string, ToolProfile> = {
  claude,
  antigravity,
  codex,
  copilot,
};

export function getToolProfile(name: string): ToolProfile | undefined {
  return TOOL_PROFILES[name];
}

export function getToolNames(): string[] {
  return Object.keys(TOOL_PROFILES);
}
