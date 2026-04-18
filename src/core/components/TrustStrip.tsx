import { Star, Calendar, Shield, CheckCircle } from 'lucide-react';
import type { LocalBusiness } from '@/core/types/adapter';

export function TrustStrip({ config }: { config: LocalBusiness }) {
  const { foundingYear, reviewRating, reviewCount } = config;
  const year = foundingYear ?? 1987;
  const rating = reviewRating ?? 4.9;
  const reviews = reviewCount ?? 124;

  const items = [
    {
      icon: Star,
      label: `${rating} · ${reviews} reseñas Google`,
      color: 'text-amber-400',
    },
    {
      icon: Calendar,
      label: `Desde ${year}`,
      color: 'text-primary',
    },
    {
      icon: Shield,
      label: 'Garantía 3 meses / 2.000 km',
      color: 'text-success',
    },
    {
      icon: CheckCircle,
      label: 'Presupuesto sin compromiso',
      color: 'text-info',
    },
  ] as const;

  return (
    <div className="w-full border-y border-border/40 bg-card/40">
      <div className="mx-auto max-w-6xl px-5 py-3">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {items.map(({ icon: Icon, label, color }) => (
            <li key={label} className="flex items-center gap-2 text-xs text-muted-foreground/80">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} aria-hidden />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
