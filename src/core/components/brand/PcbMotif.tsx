interface PcbMotifProps {
  className?: string;
}

/**
 * FEAT-038 PR 6 — Simplified PCB micro-motif used as a section divider.
 *
 * Server Component. ≤ 4 KB inline SVG. Token-driven colours so it survives
 * dark theme + forced-colors. No animation by default; the host section can
 * opt in via the `pcb-motif--animate` class.
 *
 *   substrate trace = --color-brand-amber  (copper)
 *   accent stripe   = --color-brand-red    (power rail tick)
 *   silkscreen      = --color-brand-ink    (text-coloured hairlines)
 */
export function PcbMotif({ className }: PcbMotifProps) {
  return (
    <div className={['pcb-motif', className].filter(Boolean).join(' ')} aria-hidden="true">
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        role="presentation"
        focusable="false"
      >
        <line x1="0" y1="30" x2="1200" y2="30" className="pcb-motif-rail" />

        <path
          d="M 80 30 L 200 30 L 220 10 L 360 10 L 380 30 L 520 30"
          fill="none"
          className="pcb-motif-trace pcb-motif-trace--copper"
        />
        <path
          d="M 680 30 L 820 30 L 840 50 L 980 50 L 1000 30 L 1120 30"
          fill="none"
          className="pcb-motif-trace pcb-motif-trace--copper"
        />
        <path
          d="M 540 30 L 580 30 L 600 18 L 640 18"
          fill="none"
          className="pcb-motif-trace pcb-motif-trace--data"
        />

        <circle cx="80" cy="30" r="3" className="pcb-motif-via" />
        <circle cx="220" cy="10" r="2.5" className="pcb-motif-via" />
        <circle cx="380" cy="30" r="3" className="pcb-motif-via" />
        <circle cx="600" cy="18" r="2.5" className="pcb-motif-via" />
        <circle cx="840" cy="50" r="3" className="pcb-motif-via" />
        <circle cx="1000" cy="30" r="2.5" className="pcb-motif-via" />
        <circle cx="1120" cy="30" r="3" className="pcb-motif-via" />

        <rect x="582" y="22" width="36" height="16" className="pcb-motif-chip" rx="1" />

        <rect x="0" y="0" width="4" height="60" className="pcb-motif-stripe pcb-motif-stripe--1" />
        <rect x="6" y="0" width="4" height="60" className="pcb-motif-stripe pcb-motif-stripe--2" />
        <rect x="12" y="0" width="4" height="60" className="pcb-motif-stripe pcb-motif-stripe--3" />
      </svg>
    </div>
  );
}
