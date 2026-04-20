'use client';

import { useState } from 'react';
import type { ServiceRevenue } from '@/lib/reports/aggregations';

type Props = {
  data: ServiceRevenue[];
};

const COLORS = [
  'hsl(349 90% 52%)',
  'hsl(22 100% 55%)',
  'hsl(210 80% 55%)',
  'hsl(142 70% 45%)',
  'hsl(280 70% 60%)',
  'hsl(50 90% 55%)',
  'hsl(180 60% 45%)',
];

const SIZE = 180;
const RADIUS = 70;
const INNER_RADIUS = 42;
const CX = SIZE / 2;
const CY = SIZE / 2;

/** Computes SVG arc path for a donut slice. */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startAngle));
  const y1 = cy + r * Math.sin(rad(startAngle));
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy + r * Math.sin(rad(endAngle));
  const ix1 = cx + innerR * Math.cos(rad(endAngle));
  const iy1 = cy + innerR * Math.sin(rad(endAngle));
  const ix2 = cx + innerR * Math.cos(rad(startAngle));
  const iy2 = cy + innerR * Math.sin(rad(startAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ');
}

export function ServiceDonutChart({ data }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sin datos para el período seleccionado
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.total, 0);
  let currentAngle = -90;

  const slices = data.map((item, i) => {
    const sweep = (item.total / total) * 360;
    const start = currentAngle;
    const end = currentAngle + sweep;
    currentAngle = end;
    const color = COLORS[i % COLORS.length];
    return { item, start, end, color, index: i };
  });

  const activeSlice = hovered !== null ? slices[hovered] : null;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative shrink-0">
        <svg width={SIZE} height={SIZE} role="img" aria-label="Desglose por servicio">
          {slices.map(({ item, start, end, color, index }) => {
            const isHovered = hovered === index;
            const scale = isHovered ? 1.04 : 1;
            return (
              <path
                key={item.service}
                d={arcPath(CX, CY, RADIUS, INNER_RADIUS, start, end)}
                fill={color}
                opacity={hovered === null || isHovered ? 1 : 0.5}
                style={{ transform: `scale(${scale})`, transformOrigin: `${CX}px ${CY}px`, transition: 'all 0.15s' }}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {/* Centre label */}
          {activeSlice ? (
            <>
              <text x={CX} y={CY - 8} textAnchor="middle" fontSize={11} fill="hsl(210 20% 96%)" fontWeight={600}>
                {activeSlice.item.percentage.toFixed(1)}%
              </text>
              <text x={CX} y={CY + 8} textAnchor="middle" fontSize={9} fill="hsl(210 10% 50%)">
                {activeSlice.item.service.slice(0, 14)}
              </text>
            </>
          ) : (
            <>
              <text x={CX} y={CY - 4} textAnchor="middle" fontSize={11} fill="hsl(210 20% 96%)" fontWeight={600}>
                {data.length}
              </text>
              <text x={CX} y={CY + 10} textAnchor="middle" fontSize={9} fill="hsl(210 10% 50%)">
                servicios
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <ul className="space-y-2 min-w-0 flex-1">
        {slices.map(({ item, color, index }) => (
          <li
            key={item.service}
            className="flex items-center justify-between gap-2 text-sm cursor-pointer"
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-foreground truncate">{item.service}</span>
            </span>
            <span className="text-muted-foreground shrink-0">{item.percentage.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
