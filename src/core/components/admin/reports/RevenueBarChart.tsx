'use client';

import { useState } from 'react';
import type { DailyRevenue } from '@/lib/reports/aggregations';

type Props = {
  data: DailyRevenue[];
};

type Tooltip = {
  x: number;
  y: number;
  item: DailyRevenue;
};

const CHART_HEIGHT = 200;
const BAR_GAP = 4;
const LABEL_HEIGHT = 32;

export function RevenueBarChart({ data }: Props) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Sin datos para el período seleccionado
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const totalWidth = data.length * (32 + BAR_GAP);
  const svgWidth = Math.max(totalWidth, 320);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${svgWidth}px` }} className="relative">
        <svg
          width={svgWidth}
          height={CHART_HEIGHT + LABEL_HEIGHT}
          role="img"
          aria-label="Gráfico de ingresos diarios"
        >
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = CHART_HEIGHT - fraction * CHART_HEIGHT + 4;
            return (
              <line
                key={fraction}
                x1={0}
                y1={y}
                x2={svgWidth}
                y2={y}
                stroke="var(--border)"
                strokeWidth={1}
              />
            );
          })}

          {data.map((item, i) => {
            const barWidth = 28;
            const x = i * (barWidth + BAR_GAP) + BAR_GAP / 2;

            const totalHeight = (item.total / maxTotal) * (CHART_HEIGHT - 8);
            const baseHeight = (item.base / maxTotal) * (CHART_HEIGHT - 8);
            const ivaHeight = totalHeight - baseHeight;

            const totalY = CHART_HEIGHT + 4 - totalHeight;
            const ivaY = totalY;
            const baseY = ivaY + ivaHeight;

            // Short date label: "14\nlun"
            const d = new Date(item.date + 'T12:00:00');
            const dayNum = d.getDate();
            const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 3);

            return (
              <g key={item.date}>
                {/* IVA segment (top, accent orange) */}
                <rect
                  x={x}
                  y={ivaY}
                  width={barWidth}
                  height={Math.max(ivaHeight, 0)}
                  fill="var(--accent)"
                  rx={2}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.closest('svg')!.getBoundingClientRect();
                    setTooltip({
                      x: x + barWidth / 2,
                      y: totalY - 8,
                      item,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
                {/* Base segment (bottom, primary red) */}
                <rect
                  x={x}
                  y={baseY}
                  width={barWidth}
                  height={Math.max(baseHeight, 0)}
                  fill="var(--primary)"
                  rx={2}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.closest('svg')!.getBoundingClientRect();
                    setTooltip({
                      x: x + barWidth / 2,
                      y: totalY - 8,
                      item,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
                {/* Date label */}
                <text
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT + 18}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--muted-fg)"
                >
                  {dayNum}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT + 30}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--muted-fg)"
                >
                  {weekday}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {tooltip && (
            <g>
              <rect
                x={Math.min(tooltip.x - 60, svgWidth - 128)}
                y={Math.max(tooltip.y - 72, 4)}
                width={120}
                height={68}
                rx={6}
                fill="var(--card)"
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={Math.min(tooltip.x, svgWidth - 68)}
                y={Math.max(tooltip.y - 54, 22)}
                textAnchor="middle"
                fontSize={10}
                fill="var(--fg)"
                fontWeight={600}
              >
                {tooltip.item.date}
              </text>
              <text
                x={Math.min(tooltip.x, svgWidth - 68)}
                y={Math.max(tooltip.y - 38, 38)}
                textAnchor="middle"
                fontSize={10}
                fill="var(--primary)"
              >
                Base: {tooltip.item.base.toFixed(2)} €
              </text>
              <text
                x={Math.min(tooltip.x, svgWidth - 68)}
                y={Math.max(tooltip.y - 22, 54)}
                textAnchor="middle"
                fontSize={10}
                fill="var(--accent)"
              >
                IVA: {tooltip.item.iva.toFixed(2)} €
              </text>
              <text
                x={Math.min(tooltip.x, svgWidth - 68)}
                y={Math.max(tooltip.y - 6, 70)}
                textAnchor="middle"
                fontSize={10}
                fill="var(--fg)"
                fontWeight={600}
              >
                Total: {tooltip.item.total.toFixed(2)} €
              </text>
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
            Base
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-accent inline-block" />
            IVA
          </span>
        </div>
      </div>
    </div>
  );
}
