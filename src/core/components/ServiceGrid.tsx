'use client';

import { motion } from 'framer-motion';
import { Wrench, Car, Settings, CircleDot, Shield, Cpu, ScanLine, BadgeCheck, Clock } from 'lucide-react';
import type { Service } from '@/core/types/adapter';
import { cn } from '@/lib/cn';

type Props = {
  services: Service[];
  ivaRate: number;
  locale?: string;
  currency?: string;
};

const SERVICE_ICONS: Record<string, React.ElementType> = {
  'cambio-aceite':           Wrench,
  'pre-itv':                 Car,
  'mecanica-general':        Settings,
  'cambio-neumaticos':       CircleDot,
  'frenos':                  Shield,
  'diagnostico-electronico': Cpu,
  'escaner-obd':             ScanLine,
  'electronica':             Cpu,
};

function formatCurrency(amount: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

function openChatWithService(serviceId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('amg:open-chat', { detail: { serviceId } }));
  }
}

export function ServiceGrid({ services, ivaRate, locale = 'es-ES', currency = 'EUR' }: Props) {
  const fmt = (n: number) => formatCurrency(n, locale, currency);

  return (
    <section id="servicios" className="relative px-5 py-20 sm:py-24 bg-background">
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col items-center text-center gap-3">
          <span className="amg-stripes" aria-hidden>
            <span /><span /><span />
          </span>
          <p className="eyebrow">Servicios</p>
          <h2 className="h2 max-w-2xl">Trabajos honestos, presupuestos por escrito.</h2>
          <p className="lead max-w-xl">
            Precios orientativos. IVA desglosado. Antes de tocar el coche, te lo enseñamos por escrito.
          </p>
          <p className="meta">RD 1457/1986 · Garantía mínima de 3 meses</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => {
            const Icon = SERVICE_ICONS[service.id] ?? (service.category ? SERVICE_ICONS[service.category] : undefined) ?? Wrench;
            const iva = service.basePrice * ivaRate;
            const total = service.basePrice + iva;

            return (
              <motion.article
                key={service.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ y: -2 }}
                className={cn(
                  'ticket relative overflow-hidden flex flex-col p-6 transition-shadow duration-300',
                  'hover:shadow-[var(--shadow-lg)]',
                )}
              >
                <div className="amg-edge" aria-hidden />

                <div className="relative pl-3 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center justify-center w-11 h-11 rounded-[--radius] bg-secondary border border-border">
                      <Icon className="h-5 w-5 text-foreground" aria-hidden />
                    </div>
                    <span className="flex items-center gap-1 meta border border-border rounded-full px-2 py-0.5 bg-card">
                      <Clock className="h-2.5 w-2.5" aria-hidden />
                      ~{service.duration}min
                    </span>
                  </div>

                  <h3 className="h4 mb-2 text-foreground">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-[--fg-secondary] leading-relaxed mb-4 flex-1">
                      {service.description}
                    </p>
                  )}

                  <div className="mt-auto mb-3">
                    <p className="text-base font-semibold text-foreground">
                      Desde <span className="price text-primary">{fmt(total)}</span>{' '}
                      <span className="meta inline">con IVA</span>
                    </p>
                  </div>

                  <details className="group/details mb-3">
                    <summary className="cursor-pointer meta hover:text-foreground transition-colors select-none list-none flex items-center gap-1">
                      <span className="group-open/details:hidden">▶ Ver desglose IVA</span>
                      <span className="hidden group-open/details:inline">▼ Ocultar desglose</span>
                    </summary>
                    <div className="mt-2 space-y-1 border border-border rounded-[--radius] p-3 bg-secondary text-xs">
                      <div className="flex justify-between text-[--fg-secondary]">
                        <span>Base imponible</span>
                        <span className="price">{fmt(service.basePrice)}</span>
                      </div>
                      <div className="flex justify-between text-[--fg-secondary]">
                        <span>IVA ({(ivaRate * 100).toFixed(0)}%)</span>
                        <span className="price">{fmt(iva)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground border-t border-border pt-1.5 mt-1">
                        <span>Total</span>
                        <span className="price text-primary">{fmt(total)}</span>
                      </div>
                    </div>
                  </details>

                  <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[--success-muted] border border-[oklch(0.58_0.14_148/0.25)] w-fit text-[10px] font-medium text-success">
                    <BadgeCheck className="h-3 w-3 shrink-0" aria-hidden />
                    <span>3 meses o 2.000 km</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openChatWithService(service.id)}
                    aria-label={`Reservar ${service.name}`}
                    className="w-full h-11 rounded-[--radius-md] bg-primary text-primary-foreground text-sm font-semibold hover:bg-[--brand-red-dark] active:translate-y-px transition-all duration-150"
                  >
                    Reservar
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
