interface RuleDividerProps {
  className?: string;
}

/**
 * FEAT-038 — Engineering rule section divider.
 *
 * Replaces PcbMotif. Server Component. Renders a caliper-style baseline with
 * mono-numeral tick labels (0/25/50/75/100 mm) and a registration tick that
 * sweeps left→right once on mount. Tokenised colours, no inline hex.
 *
 *   baseline   → --fg (color-mix to soften)
 *   labels     → --fg-muted, font-mono
 *   tick       → --color-brand-red (registration mark)
 *
 * Animation: `rule-marker-sweep` runs once, killed under prefers-reduced-motion.
 */
export function RuleDivider({ className }: RuleDividerProps) {
  return (
    <div
      className={['rule-divider', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1000 60"
        preserveAspectRatio="none"
        role="presentation"
        focusable="false"
      >
        <line x1="0" y1="34" x2="1000" y2="34" className="rule-baseline" />

        <line x1="40" y1="22" x2="40" y2="34" className="rule-tick rule-tick--major" />
        <line x1="290" y1="22" x2="290" y2="34" className="rule-tick rule-tick--major" />
        <line x1="540" y1="22" x2="540" y2="34" className="rule-tick rule-tick--major" />
        <line x1="790" y1="22" x2="790" y2="34" className="rule-tick rule-tick--major" />
        <line x1="960" y1="22" x2="960" y2="34" className="rule-tick rule-tick--major" />

        <line x1="115" y1="26" x2="115" y2="34" className="rule-tick rule-tick--minor" />
        <line x1="190" y1="26" x2="190" y2="34" className="rule-tick rule-tick--minor" />
        <line x1="365" y1="26" x2="365" y2="34" className="rule-tick rule-tick--minor" />
        <line x1="440" y1="26" x2="440" y2="34" className="rule-tick rule-tick--minor" />
        <line x1="615" y1="26" x2="615" y2="34" className="rule-tick rule-tick--minor" />
        <line x1="690" y1="26" x2="690" y2="34" className="rule-tick rule-tick--minor" />
        <line x1="865" y1="26" x2="865" y2="34" className="rule-tick rule-tick--minor" />

        <text x="40" y="54" textAnchor="middle" className="rule-label">0</text>
        <text x="290" y="54" textAnchor="middle" className="rule-label">25</text>
        <text x="540" y="54" textAnchor="middle" className="rule-label">50</text>
        <text x="790" y="54" textAnchor="middle" className="rule-label">75</text>
        <text x="960" y="54" textAnchor="middle" className="rule-label">100</text>

        <g className="rule-marker">
          <line x1="0" y1="10" x2="0" y2="34" className="rule-marker-line" />
          <polygon points="-5,8 5,8 0,16" className="rule-marker-flag" />
        </g>
      </svg>
    </div>
  );
}
