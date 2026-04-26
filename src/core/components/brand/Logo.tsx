import type { CSSProperties } from 'react';

type LogoVariant = 'wordmark' | 'lockup';

interface LogoProps {
  variant?: LogoVariant;
  size?: number;
  /** Reserved for future ribbon/SEO callers. Not rendered as visible text. */
  establishedYear?: number;
  className?: string;
  ariaLabel?: string;
}

const VIEWBOX_WIDTH = 340;
const VIEWBOX_HEIGHT = 112;

/**
 * FEAT-038 — Logo "Direction A": punch-stamp / cast-iron casting-mark treatment.
 *
 * Pistons-A glyph remains the central metaphor (mechanic shop heritage) but the
 * fill picks up an inner-shadow + outer chamfer to read as a stamped/cast mark
 * rather than a flat sticker. Pistons fire once on mount via a CSS one-shot
 * animation; hover re-triggers it. `prefers-reduced-motion` freezes both.
 *
 * Lockup variant adds a tri-stripe service ribbon beside the wordmark using the
 * brand palette (amber / paper / signal-red). The previous "Cartagena · ES ·
 * Est." side-text is removed because the Hero eyebrow already carries it
 * (duplication caught in QA).
 */
export function Logo({
  variant = 'wordmark',
  size = 48,
  className,
  ariaLabel = 'Talleres AMG',
}: LogoProps) {
  const isStroke = size < 32;
  const glyphClass = isStroke ? 'glyph-stroke' : 'glyph';
  const strokeProps = isStroke
    ? { fill: 'none', stroke: 'currentColor', strokeWidth: 4, strokeLinejoin: 'round' as const }
    : { fill: 'currentColor' };
  const stampFilter = isStroke ? undefined : 'url(#amg-stamp)';

  const wrapperStyle: CSSProperties = { color: 'var(--color-foreground)' };

  return (
    <div
      className={['amg-logo amg-logo--stamp inline-flex items-center', variant === 'lockup' ? 'gap-3' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={wrapperStyle}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        height={size}
        role="img"
        aria-label={ariaLabel}
        style={{ width: 'auto', display: 'block' }}
      >
        <defs>
          {/* Punch-stamp / casting-mark depth: bright top-edge + soft inner shadow. */}
          <filter id="amg-stamp" x="-4%" y="-4%" width="108%" height="116%">
            {/* Top-edge highlight (cut-metal lip). */}
            <feFlood floodColor="white" floodOpacity="0.22" result="hi" />
            <feComposite in="hi" in2="SourceAlpha" operator="in" result="hiClip" />
            <feOffset in="hiClip" dy="1.2" result="hiShift" />
            {/* Inner shadow (debossed depth). */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
            <feOffset in="blur" dy="1.6" result="shadowOff" />
            <feFlood floodColor="black" floodOpacity="0.32" result="shadowColor" />
            <feComposite in="shadowColor" in2="shadowOff" operator="in" result="shadow" />
            <feComposite in="shadow" in2="SourceAlpha" operator="in" result="shadowIn" />
            {/* Stack: source + inner shadow (clipped) + top highlight. */}
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="shadowIn" />
              <feMergeNode in="hiShift" />
            </feMerge>
          </filter>
        </defs>

        {/* ============ LETTER A (pistons-A) — x: 10..98 ============ */}
        <g transform="rotate(-14 32 100)">
          <g className="piston-l">
            <path
              className={glyphClass}
              d="M22 32 L42 32 L42 100 L22 100 Z"
              {...strokeProps}
              filter={stampFilter}
            />
            <path className={glyphClass} d="M21 28 L43 28 L43 32 L21 32 Z" {...strokeProps} />
            <rect x="22" y="44" width="20" height="2" fill="var(--color-background)" />
            <rect x="22" y="50" width="20" height="2" fill="var(--color-background)" />
            <rect x="22" y="56" width="20" height="2" fill="var(--color-background)" />
            <circle cx="32" cy="74" r="2.4" fill="var(--color-background)" />
            <rect
              className="ring-sweep-l engrave-highlight"
              x="22"
              y="42"
              width="20"
              height="18"
              fill="white"
              opacity="0"
              style={{ mixBlendMode: 'overlay' }}
            />
          </g>
        </g>

        <g transform="rotate(14 76 100)">
          <g className="piston-r">
            <path
              className={glyphClass}
              d="M66 32 L86 32 L86 100 L66 100 Z"
              {...strokeProps}
              filter={stampFilter}
            />
            <path className={glyphClass} d="M65 28 L87 28 L87 32 L65 32 Z" {...strokeProps} />
            <rect x="66" y="44" width="20" height="2" fill="var(--color-background)" />
            <rect x="66" y="50" width="20" height="2" fill="var(--color-background)" />
            <rect x="66" y="56" width="20" height="2" fill="var(--color-background)" />
            <circle cx="76" cy="74" r="2.4" fill="var(--color-background)" />
            <rect
              className="ring-sweep-r engrave-highlight"
              x="66"
              y="42"
              width="20"
              height="18"
              fill="white"
              opacity="0"
              style={{ mixBlendMode: 'overlay' }}
            />
          </g>
        </g>

        <rect
          className={glyphClass}
          x="30"
          y="68"
          width="48"
          height="6"
          {...strokeProps}
          filter={stampFilter}
        />

        {/* ============ LETTER M (mirrored apex) — x: 116..226 ============ */}
        <path
          className={glyphClass}
          d="M116 100 L116 12 L132 12 L171 70 L210 12 L226 12 L226 100 L210 100 L210 38 L177 86 L165 86 L132 38 L132 100 Z"
          {...strokeProps}
          filter={stampFilter}
        />

        {/* ============ LETTER G (flat-cut machined terminal) — x: 240..328 ============ */}
        <path
          className={glyphClass}
          d="M328 56 L328 100 L296 100 L296 84 L312 84 L312 70 L284 70 L284 86 Q284 100 270 100 L256 100 Q240 100 240 84 L240 28 Q240 12 256 12 L312 12 Q328 12 328 28 L328 36 L312 36 L312 32 Q312 28 308 28 L260 28 Q256 28 256 32 L256 80 Q256 84 260 84 L266 84 Q270 84 270 80 L270 56 Z"
          {...strokeProps}
          filter={stampFilter}
        />
      </svg>

      {variant === 'lockup' && (
        <div className="flex flex-col justify-center leading-none">
          <div
            aria-hidden="true"
            className="amg-logo-ribbon flex h-1.5 w-9 overflow-hidden rounded-[1px]"
          >
            <span
              className="amg-logo-stripe amg-logo-stripe--amber h-full flex-1"
              style={{ background: 'var(--color-brand-amber)' }}
            />
            <span
              className="amg-logo-stripe amg-logo-stripe--paper h-full flex-1"
              style={{ background: 'var(--color-brand-paper)' }}
            />
            <span
              className="amg-logo-stripe amg-logo-stripe--red h-full flex-1"
              style={{ background: 'var(--color-brand-red)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
