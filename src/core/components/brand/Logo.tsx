import type { CSSProperties } from 'react';

type LogoVariant = 'wordmark' | 'lockup';

interface LogoProps {
  variant?: LogoVariant;
  size?: number;
  establishedYear?: number;
  className?: string;
  ariaLabel?: string;
}

const VIEWBOX_WIDTH = 340;
const VIEWBOX_HEIGHT = 112;

export function Logo({
  variant = 'wordmark',
  size = 48,
  establishedYear = 1987,
  className,
  ariaLabel = 'Talleres AMG',
}: LogoProps) {
  const isStroke = size < 32;
  const glyphClass = isStroke ? 'glyph-stroke' : 'glyph';
  const strokeProps = isStroke
    ? { fill: 'none', stroke: 'currentColor', strokeWidth: 4, strokeLinejoin: 'round' as const }
    : { fill: 'currentColor' };

  const wrapperStyle: CSSProperties = { color: 'var(--color-foreground)' };

  return (
    <div
      className={['amg-logo inline-flex items-center', variant === 'lockup' ? 'gap-3' : '', className]
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
          {/* Engraved inner highlight: thin top-edge light suggesting cut metal. */}
          <filter id="amg-engrave" x="-2%" y="-2%" width="104%" height="108%">
            <feFlood floodColor="white" floodOpacity="0.18" result="hi" />
            <feComposite in="hi" in2="SourceAlpha" operator="in" result="hiClip" />
            <feOffset in="hiClip" dy="1.2" result="hiShift" />
            <feComposite in="SourceGraphic" in2="hiShift" operator="over" />
          </filter>
        </defs>

        {/* ============ LETTER A (pistons-A) — x: 10..98 ============ */}
        {/* Left piston leg: rotated -14deg around its bottom pivot. */}
        <g transform="rotate(-14 32 100)">
          <g className="piston-l">
            <path
              className={glyphClass}
              d="M22 32 L42 32 L42 100 L22 100 Z"
              {...strokeProps}
              filter={isStroke ? undefined : 'url(#amg-engrave)'}
            />
            {/* Crown lip (peeks above cap-height). */}
            <path className={glyphClass} d="M21 28 L43 28 L43 32 L21 32 Z" {...strokeProps} />
            {/* Three ring grooves cut as negative space. */}
            <rect x="22" y="44" width="20" height="2" fill="var(--color-background)" />
            <rect x="22" y="50" width="20" height="2" fill="var(--color-background)" />
            <rect x="22" y="56" width="20" height="2" fill="var(--color-background)" />
            {/* Wrist-pin marker. */}
            <circle cx="32" cy="74" r="2.4" fill="var(--color-background)" />
            {/* Light-sweep pass over the ring grooves on hover. */}
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

        {/* Right piston leg: rotated +14deg around its bottom pivot. */}
        <g transform="rotate(14 76 100)">
          <g className="piston-r">
            <path
              className={glyphClass}
              d="M66 32 L86 32 L86 100 L66 100 Z"
              {...strokeProps}
              filter={isStroke ? undefined : 'url(#amg-engrave)'}
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

        {/* A crossbar — the wrist pin axis of the A. */}
        <rect
          className={glyphClass}
          x="30"
          y="68"
          width="48"
          height="6"
          {...strokeProps}
          filter={isStroke ? undefined : 'url(#amg-engrave)'}
        />

        {/* ============ LETTER M (custom, mirrored apex break) — x: 116..226 ============ */}
        {/* Apex break angle mirrors the piston angle (-14/+14). */}
        <path
          className={glyphClass}
          d="M116 100 L116 12 L132 12 L171 70 L210 12 L226 12 L226 100 L210 100 L210 38 L177 86 L165 86 L132 38 L132 100 Z"
          {...strokeProps}
          filter={isStroke ? undefined : 'url(#amg-engrave)'}
        />

        {/* ============ LETTER G (custom, flat-cut machined terminal) — x: 240..328 ============ */}
        {/* Outer ring with a flat right-edge cut, internal crossbar terminating square. */}
        <path
          className={glyphClass}
          d="M328 56 L328 100 L296 100 L296 84 L312 84 L312 70 L284 70 L284 86 Q284 100 270 100 L256 100 Q240 100 240 84 L240 28 Q240 12 256 12 L312 12 Q328 12 328 28 L328 36 L312 36 L312 32 Q312 28 308 28 L260 28 Q256 28 256 32 L256 80 Q256 84 260 84 L266 84 Q270 84 270 80 L270 56 Z"
          {...strokeProps}
          filter={isStroke ? undefined : 'url(#amg-engrave)'}
        />
      </svg>

      {variant === 'lockup' && (
        <div className="flex flex-col justify-center leading-none">
          <div
            aria-hidden="true"
            className="flex h-1.5 w-9 overflow-hidden rounded-[1px]"
            style={{ marginBottom: '0.35rem' }}
          >
            <span className="h-full flex-1" style={{ background: 'var(--color-primary)' }} />
            <span className="h-full flex-1" style={{ background: 'var(--color-foreground)' }} />
            <span className="h-full flex-1" style={{ background: 'var(--color-accent, var(--color-primary))' }} />
          </div>
          <span
            className="font-mono text-[0.625rem] uppercase tracking-[0.22em]"
            style={{ color: 'var(--color-muted-foreground)', fontFeatureSettings: '"ss01" 1' }}
          >
            Cartagena · ES · Est.{' '}
            <span data-todo="brand-est-year">{establishedYear}</span>
          </span>
        </div>
      )}
    </div>
  );
}
