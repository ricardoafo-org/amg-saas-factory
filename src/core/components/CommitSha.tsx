export function CommitSha() {
  const sha = process.env['NEXT_PUBLIC_COMMIT_SHA'];
  if (!sha) return null;

  return (
    <span className="text-[10px] font-mono text-muted-foreground/30">
      {sha.slice(0, 7)}
    </span>
  );
}
