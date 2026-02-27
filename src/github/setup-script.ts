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

# Fetch user profile (works with default gh auth scopes)
login=""
name=""
user_id=""
if user_out="$(gh api user --jq '[.login, (.name // .login), (.id | tostring)] | join("\\n")' 2>/dev/null)"; then
  login="$(echo "$user_out" | sed -n '1p')"
  name="$(echo "$user_out" | sed -n '2p')"
  user_id="$(echo "$user_out" | sed -n '3p')"
fi

if [ -n "$name" ]; then
  git config --global user.name "$name"
fi

# Try the emails endpoint first (requires user:email scope).
# Fall back to the GitHub noreply address which works with default scopes
# and is GitHub's recommended format for commit attribution.
email=""
if email_out="$(gh api user/emails --jq '[.[] | select(.primary)] | .[0].email // empty' 2>/dev/null)"; then
  email="$email_out"
fi
if [ -z "$email" ] && [ -n "$user_id" ] && [ -n "$login" ]; then
  email="\${user_id}+\${login}@users.noreply.github.com"
fi
if [ -n "$email" ]; then
  git config --global user.email "$email"
fi

echo "nebubox-gh-setup: git identity configured:"
echo "  user.name  = \${name:-(not set)}"
echo "  user.email = \${email:-(not set)}"
echo ""
echo "  To change, run:"
echo "    git config --global user.name 'Your Name'"
echo "    git config --global user.email 'you@example.com'"
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
