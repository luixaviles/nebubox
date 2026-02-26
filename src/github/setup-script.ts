/**
 * Bash script installed as /usr/local/bin/nebubox-gh-setup.
 * After `gh auth login`, it configures the git credential helper
 * and sets git user.name / user.email from the GitHub account.
 */
export const GH_SETUP_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail

# Verify gh is authenticated
if ! gh auth status >/dev/null 2>&1; then
  echo "nebubox-gh-setup: gh is not authenticated — skipping git config."
  exit 0
fi

# Install GitHub credential helper
gh auth setup-git

# Fetch name from GitHub profile
name="$(gh api user --jq '.name // .login' 2>/dev/null || true)"
if [ -n "$name" ]; then
  git config --global user.name "$name"
fi

# Fetch primary email (requires read:user or user:email scope)
email="$(gh api user/emails --jq '[.[] | select(.primary)] | .[0].email // empty' 2>/dev/null || true)"
if [ -n "$email" ]; then
  git config --global user.email "$email"
fi

if [ -n "$name" ] || [ -n "$email" ]; then
  echo "nebubox-gh-setup: git configured as $name <$email>"
  echo "  Override with: git config --global user.name 'Your Name'"
else
  echo "nebubox-gh-setup: could not fetch GitHub profile info. Set git identity manually:"
  echo "  git config --global user.name 'Your Name'"
  echo "  git config --global user.email 'you@example.com'"
fi
`;

/**
 * Snippet appended to the coder user's .bashrc.
 * Runs nebubox-gh-setup once per shell when gh is authenticated
 * but git user.name has not been configured yet.
 */
export const GH_BASHRC_HOOK = `
# nebubox: auto-configure git identity from GitHub
if command -v gh >/dev/null 2>&1 \\
   && gh auth status >/dev/null 2>&1 \\
   && [ -z "$(git config --global user.name 2>/dev/null)" ]; then
  nebubox-gh-setup
fi
`;
