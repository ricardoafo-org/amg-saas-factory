import type { CSSProperties } from 'react';

interface PcbHeroProps {
  className?: string;
  ariaLabel?: string;
}

const VB_W = 800;
const VB_H = 500;

/**
 * FEAT-038 PR 4 — PCB stylised hero (Server Component).
 *
 * Editorial inline SVG. References: Teenage Engineering product pages,
 * Leica camera engravings, Linear brand illustrations. NOT photoreal,
 * NOT 3D, NOT GLB. ≤ 15 KB on disk.
 *
 * Token-driven colours so the dark theme + forced-colors mode still work:
 *   substrate        = --color-brand-ink   (near-black)
 *   copper traces    = --color-brand-amber
 *   data / bus lines = --color-brand-m-lightblue
 *   power rails      = --color-brand-red
 *   chip             = --color-pcb-chip   (semantic alias for silver)
 *   silkscreen       = --color-brand-paper
 *
 * Animation is CSS-only (load-time trace draw via stroke-dashoffset);
 * fully suppressed under prefers-reduced-motion and remapped under
 * forced-colors: active.
 */
export function PcbHero({ className, ariaLabel = 'Diagrama estilizado de una placa de circuito impreso' }: PcbHeroProps) {
  const style: CSSProperties = { display: 'block', width: '100%', height: 'auto' };

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={ariaLabel}
      className={['pcb-hero', className].filter(Boolean).join(' ')}
      style={style}
    >
      <title>{ariaLabel}</title>

      <defs>
        <pattern id="pcb-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="var(--color-brand-amber)" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Substrate — near-black PCB. */}
      <rect x="40" y="40" width="720" height="420" rx="8" fill="var(--color-brand-ink)" />
      {/* Subtle copper grid texture. */}
      <rect x="40" y="40" width="720" height="420" rx="8" fill="url(#pcb-grid)" />

      {/* Silkscreen frame (1px inset). */}
      <rect
        x="50"
        y="50"
        width="700"
        height="400"
        rx="4"
        fill="none"
        stroke="var(--color-brand-paper)"
        strokeOpacity="0.18"
        strokeWidth="1"
      />

      {/* AMG tri-stripe etched into silkscreen — top-left corner signature. */}
      <g aria-hidden="true">
        <rect x="60" y="60" width="14" height="3" fill="var(--color-brand-m-lightblue)" />
        <rect x="76" y="60" width="14" height="3" fill="var(--color-brand-m-darkblue)" />
        <rect x="92" y="60" width="14" height="3" fill="var(--color-brand-red)" />
        <text
          x="60"
          y="76"
          fill="var(--color-brand-paper)"
          fillOpacity="0.55"
          fontFamily="var(--font-mono)"
          fontSize="9"
          letterSpacing="0.18em"
        >
          AMG · CARTAGENA
        </text>
      </g>

      {/* ── Copper traces (amber) ── */}
      <g
        className="pcb-trace pcb-trace-copper"
        fill="none"
        stroke="var(--color-brand-amber)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M120 200 H300 V160 H420" />
        <path d="M120 240 H280 V300 H400" />
        <path d="M680 200 H540 V160 H460" />
        <path d="M680 280 H580 V340 H460" />
        <path d="M120 360 H260 V400 H520" />
      </g>

      {/* ── Data / bus lines (light-blue) ── */}
      <g
        className="pcb-trace pcb-trace-data"
        fill="none"
        stroke="var(--color-brand-m-lightblue)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M120 180 H300 V140 H440" strokeDasharray="4 4" />
        <path d="M120 220 H260 V100 H520" strokeDasharray="4 4" />
        <path d="M680 180 H540 V140 H460" strokeDasharray="4 4" />
      </g>

      {/* ── Power rails (red, thicker) ── */}
      <g
        className="pcb-trace pcb-trace-power"
        fill="none"
        stroke="var(--color-brand-red)"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M60 420 H740" strokeOpacity="0.85" />
        <path d="M60 80 H160 V420" />
        <path d="M740 80 H640 V420" />
      </g>

      {/* ── Vias (small filled circles where traces meet) ── */}
      <g fill="var(--color-brand-paper)" fillOpacity="0.85">
        <circle cx="120" cy="200" r="3" />
        <circle cx="120" cy="240" r="3" />
        <circle cx="120" cy="360" r="3" />
        <circle cx="680" cy="200" r="3" />
        <circle cx="680" cy="280" r="3" />
        <circle cx="300" cy="160" r="3" />
        <circle cx="540" cy="160" r="3" />
      </g>

      {/* ── Central chip (silver) ── */}
      <g className="pcb-chip">
        <rect
          x="320"
          y="200"
          width="160"
          height="100"
          rx="3"
          fill="var(--color-pcb-chip)"
          stroke="var(--color-brand-ink)"
          strokeWidth="1"
        />
        {/* Chip pins — top edge. */}
        <g fill="var(--color-pcb-chip)">
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={`pt-${i}`} x={336 + i * 18} y={188} width={6} height={12} rx={1} />
          ))}
          {/* Bottom edge. */}
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={`pb-${i}`} x={336 + i * 18} y={300} width={6} height={12} rx={1} />
          ))}
        </g>
        {/* Chip silkscreen label. */}
        <text
          x="400"
          y="246"
          textAnchor="middle"
          fill="var(--color-brand-ink)"
          fillOpacity="0.6"
          fontFamily="var(--font-mono)"
          fontSize="11"
          letterSpacing="0.22em"
        >
          AMG-ECU
        </text>
        <text
          x="400"
          y="266"
          textAnchor="middle"
          fill="var(--color-brand-ink)"
          fillOpacity="0.4"
          fontFamily="var(--font-mono)"
          fontSize="8"
          letterSpacing="0.16em"
        >
          DIAG · v3.2
        </text>
        {/* Pin-1 indicator dot. */}
        <circle cx="332" cy="212" r="2" fill="var(--color-brand-ink)" fillOpacity="0.5" />
      </g>

      {/* ── HUD annotations (Geist Mono, 12px, tracking widest, brand-amber) ── */}
      <g
        className="pcb-hud"
        fontFamily="var(--font-mono)"
        fontSize="12"
        letterSpacing="0.2em"
        fill="var(--color-brand-amber)"
      >
        {/* TL — diagnostic label. */}
        <line x1="120" y1="200" x2="80" y2="160" stroke="var(--color-muted-foreground)" strokeWidth="1" />
        <text x="48" y="148">OBD-II</text>

        {/* TR — protocol label. */}
        <line x1="680" y1="200" x2="720" y2="160" stroke="var(--color-muted-foreground)" strokeWidth="1" />
        <text x="700" y="148">CAN-FD</text>

        {/* BL — sensor label. */}
        <line x1="120" y1="360" x2="80" y2="400" stroke="var(--color-muted-foreground)" strokeWidth="1" />
        <text x="40" y="416">SENSOR</text>

        {/* BR — calibration label. */}
        <line x1="680" y1="280" x2="730" y2="320" stroke="var(--color-muted-foreground)" strokeWidth="1" />
        <text x="690" y="334">ADAS</text>
      </g>
    </svg>
  );
}
