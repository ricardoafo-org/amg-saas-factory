import { Phone, MapPin, Clock, ExternalLink, MessageCircle, Navigation } from 'lucide-react';
import type { LocalBusiness } from '@/core/types/adapter';

const DAY_LABELS: Record<string, string> = {
  monday:    'Lunes',
  tuesday:   'Martes',
  wednesday: 'Miércoles',
  thursday:  'Jueves',
  friday:    'Viernes',
  saturday:  'Sábado',
  sunday:    'Domingo',
};

function isOpenNow(operatingHours: LocalBusiness['operatingHours']): boolean {
  const now = new Date();
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const todayKey = dayKeys[now.getDay()];
  const today = operatingHours.find((h) => h.day === todayKey);
  if (!today || today.closed) return false;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const [oH, oM] = today.open.split(':').map(Number);
  const [cH, cM] = today.close.split(':').map(Number);
  const open = (oH ?? 0) * 60 + (oM ?? 0);
  const close = (cH ?? 0) * 60 + (cM ?? 0);
  return minutesNow >= open && minutesNow < close;
}

export function VisitSection({ config }: { config: LocalBusiness }) {
  const { contact, address, operatingHours } = config;
  const waNumber = contact.whatsapp?.replace(/\D/g, '');
  const open = isOpenNow(operatingHours);

  return (
    <section id="visitanos" className="relative px-5 py-20 sm:py-24 paper">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col items-center text-center gap-3">
          <span className="amg-stripes" aria-hidden>
            <span /><span /><span />
          </span>
          <p className="eyebrow">Visítanos</p>
          <h2 className="h2">Pásate por el taller.</h2>
          <p className="lead max-w-xl">
            Estamos en {address.city}. Sin cita también: si pasas a primera hora te atendemos.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          <article className="md:col-span-7 ticket relative overflow-hidden p-7 sm:p-9">
            <div className="amg-edge" aria-hidden />
            <div className="pl-3 flex flex-col gap-5">
              <div>
                <p className="eyebrow eyebrow-dot">Dirección</p>
                <address className="not-italic mt-3 text-lg font-medium text-foreground leading-snug">
                  {address.street}
                  <br />
                  <span className="font-mono text-base text-[--fg-secondary]">
                    {address.postalCode} {address.city}
                  </span>
                </address>
                <p className="meta mt-1.5">{address.region}, {address.country}</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                {contact.googleMapsUrl && (
                  <a
                    href={contact.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-11 px-4 rounded-[--radius-md] bg-primary text-primary-foreground text-sm font-semibold hover:bg-[--brand-red-dark] transition-colors"
                  >
                    <Navigation className="h-4 w-4" />
                    Cómo llegar
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </a>
                )}

                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-[--radius-md] bg-card text-foreground text-sm font-semibold border border-[--border-strong] hover:bg-secondary transition-colors"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="font-mono">{contact.phone}</span>
                </a>

                {waNumber && (
                  <a
                    href={`https://wa.me/${waNumber}?text=Hola,%20me%20gustar%C3%ADa%20pedir%20cita`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-11 px-4 rounded-[--radius-md] bg-card text-foreground text-sm font-semibold border border-[--border-strong] hover:bg-secondary transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-success" />
                    WhatsApp
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span
                  className={open ? 'dot-available' : 'dot-warning'}
                  role="status"
                  aria-label={open ? 'Abierto ahora' : 'Cerrado ahora'}
                />
                <span className="text-sm">
                  <span className="meta mr-1.5">{open ? 'ABIERTO AHORA' : 'CERRADO AHORA'}</span>
                  <span className="text-[--fg-secondary]">
                    {open ? '· estamos atendiendo' : '· vuelve en horario laboral'}
                  </span>
                </span>
              </div>
            </div>
          </article>

          <aside className="md:col-span-5 glass rounded-[--radius-lg] p-7 sm:p-8 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <p className="eyebrow">Horario</p>
            </div>

            <table className="w-full text-sm" aria-label="Horario de apertura">
              <tbody className="divide-y divide-border">
                {operatingHours.map((h) => (
                  <tr key={h.day} className={h.closed ? 'opacity-60' : ''}>
                    <td className="py-2 font-medium text-foreground">
                      {DAY_LABELS[h.day] ?? h.day}
                    </td>
                    <td className="py-2 text-right price text-[--fg-secondary]">
                      {h.closed ? 'Cerrado' : `${h.open} – ${h.close}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="meta pt-2 border-t border-border flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span>Polígono Cabezo Beaza · Acceso fácil desde la A-30</span>
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
