#!/usr/bin/env node
// PreToolUse hook — validates conventional commit format before git commit runs.
// Exits 1 (blocks) if the commit message doesn't follow the convention.

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const cmd = (data.tool_input?.command || '').trim();

    // Only intercept git commit commands
    if (!/git\s+commit/.test(cmd)) {
      process.exit(0);
    }

    // Extract message from -m "..." or -m '...' or heredoc
    const mMatch = cmd.match(/-m\s+["']([^"']+)["']/s) ||
                   cmd.match(/-m\s+"([\s\S]+?)"\s*$/m);
    if (!mMatch) {
      // Heredoc or interactive commit — can't validate, allow
      process.exit(0);
    }

    const msg = mMatch[1].trim().split('\n')[0]; // first line only

    // Skip merge commits and fixups
    if (/^(Merge|Revert|fixup!|squash!)/.test(msg)) process.exit(0);

    const PATTERN = /^(feat|fix|chore|docs|test|refactor|style|ci)(\([^)]+\))?: .{1,72}$/;
    if (!PATTERN.test(msg)) {
      console.error(`
[commit-msg-lint] ✗ Commit message does not follow Conventional Commits.

  Got:      "${msg}"
  Expected: <type>(<scope>): <description>  [72 chars max]

  Types: feat | fix | chore | docs | test | refactor | style | ci
  Examples:
    feat(chatbot): add calendar slot picker
    fix(slots): prevent cross-tenant IDOR
    chore: remove pixel-agents

See .gitmessage for full reference.
`);
      process.exit(1);
    }

    // Warn if Co-Authored-By is missing (not blocking)
    if (!cmd.includes('Co-Authored-By')) {
      console.warn('[commit-msg-lint] ⚠ Missing Co-Authored-By trailer (not blocking).');
    }

    process.exit(0);
  } catch {
    process.exit(0); // parse error — don't block
  }
});
