'use client';

import { motion } from 'framer-motion';
import { Wrench, Car, Settings, CircleDot, Shield, ArrowRight } from 'lucide-react';
import type { Service } from '@/core/types/adapter';

type Props = {
  services: Service[];
  ivaRate: number;
  locale?: string;
  currency?: string;
};

const SERVICE_ICONS: Record<string, React.ElementType> = {
  'cambio-aceite': Wrench,
  'pre-itv': Car,
  'mecanica-general': Settings,
  'cambio-neumaticos': CircleDot,
  'frenos': Shield,
};

const SERVICE_GRADIENT: Record<string, string> = {
  'cambio-aceite':    'from-amber-500/20 to-transparent',
  'pre-itv':          'from-blue-500/20 to-transparent',
  'mecanica-general': 'from-primary/20 to-transparent',
  'cambio-neumaticos':'from-slate-500/20 to-transparent',
  'frenos':           'from-rose-500/20 to-transparent',
};

function formatCurrency(amount: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function ServiceGrid({ services, ivaRate, locale = 'es-ES', currency = 'EUR' }: Props) {
  const fmt = (n: number) => formatCurrency(n, locale, currency);

  return (
    <section className="relative px-5 py-20 overflow-hidden">
      {/* Section grid background */}
      <div className="absolute inset-0 grid-bg opacity-30" aria-hidden />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-mono text-primary tracking-[0.2em] uppercase">Servicios</p>
          <h2 className="text-4xl font-extrabold tracking-tight">
            Nuestros <span className="gradient-text">Servicios</span>
          </h2>
          <p className="mt-3 text-muted-foreground text-sm max-w-md mx-auto">
            Precios transparentes, sin sorpresas. IVA desglosado para tu comodidad.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => {
            const Icon = SERVICE_ICONS[service.id] ?? Wrench;
            const iva = service.basePrice * ivaRate;
            const total = service.basePrice + iva;
            const gradient = SERVICE_GRADIENT[service.id] ?? 'from-primary/10 to-transparent';

            return (
              <motion.article
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ y: -4 }}
                className="group relative rounded-[--radius-lg] overflow-hidden cursor-default"
              >
                {/* Gradient border effect */}
                <div className="absolute inset-0 rounded-[--radius-lg] bg-gradient-to-br from-primary/20 via-border/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-px" aria-hidden />

                <div className="relative h-full glass-strong rounded-[--radius-lg] p-6 flex flex-col transition-colors duration-300">
                  {/* Top gradient splash */}
                  <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${gradient} rounded-t-[--radius-lg] pointer-events-none`} aria-hidden />

                  {/* Index + icon */}
                  <div className="relative flex items-start justify-between mb-4">
                    <div className="flex items-center justify-center w-11 h-11 rounded-[--radius] bg-background/60 border border-border group-hover:border-primary/40 group-hover:bg-primary/5 transition-colors duration-300">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground/40 select-none">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Name + description */}
                  <h3 className="font-bold text-base text-foreground mb-1 group-hover:text-primary transition-colors duration-200">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
                      {service.description}
                    </p>
                  )}

                  {/* Price breakdown */}
                  <div className="mt-auto space-y-1 border-t border-border/50 pt-4 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Base imponible</span>
                      <span>{fmt(service.basePrice)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>IVA ({(ivaRate * 100).toFixed(0)}%)</span>
                      <span>{fmt(iva)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-foreground border-t border-border/50 pt-2 mt-2">
                      <span>Total</span>
                      <span className="gradient-text">{fmt(total)}</span>
                    </div>
                  </div>

                  {/* Duration + CTA hint */}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground/60">
                    <span className="font-mono">{service.duration} min</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary text-[10px] font-medium tracking-wide">
                      Reservar <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
