#!/usr/bin/env node
// Blocks rm -rf targeting protected directories: clients/, pb_data/, and anything outside dist/ or tmp/
let raw = '';
process.stdin.on('data', chunk => (raw += chunk));
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(raw);
    const cmd = (payload.tool_input || {}).command || '';
    const isRmRf = /rm\s+-[rf]{1,2}f?\b/.test(cmd) || /rm\s+--recursive\b/.test(cmd);

    if (!isRmRf) { process.exit(0); return; }

    // Always block on sacred directories regardless of other flags
    const sacredPattern = /(^|\s|\/)(clients|pb_data)(\/|$|\s)/;
    if (sacredPattern.test(cmd)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: '🚫 rm -rf is permanently blocked on clients/ and pb_data/ — these contain tenant data. Delete records via PocketBase Admin UI or a safe migration script.',
      }));
      process.exit(2);
    }

    // General guard: only allow rm -rf inside dist/ or tmp/
    const safePattern = /rm\s+[-\w]+\s+(\.\/)?((dist|tmp)[/\\])/;
    if (!safePattern.test(cmd)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: 'rm -rf outside dist/ or tmp/ requires manual execution. Run the command directly in your terminal if intentional.',
      }));
      process.exit(2);
    }
  } catch {
    // Malformed input — allow rather than block valid work
  }
  process.exit(0);
});
