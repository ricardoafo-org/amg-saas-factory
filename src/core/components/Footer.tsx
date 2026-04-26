import Image from 'next/image';
import Link from 'next/link';
import { Wrench, Building2, Scale } from 'lucide-react';
import type { LocalBusiness } from '@/core/types/adapter';

export function Footer({ config }: { config: LocalBusiness }) {
  const { businessName, foundingYear, address } = config;

  // Legal metadata — prefer config.legal, fall back to hardcoded literals so
  // tenant configs without a `legal` block still render correctly.
  const cif = config.legal?.cif ?? 'B30123456';
  const regTaller = config.legal?.registrationNumber ?? '30/456';

  return (
    <footer className="ftr">
      {/* 4-column inner grid: brand · Servicios · Taller · Legal */}
      <div className="ftr-inner">
        {/* Brand column */}
        <div className="ftr-brand">
          <Image src="/logo.svg" alt={businessName} width={120} height={38} style={{ height: 38, width: 'auto' }} />
          <p>
            Taller mecánico familiar en {address.city}. Desde {foundingYear} cuidamos los coches del barrio como si fueran nuestros.
          </p>
        </div>

        {/* Servicios column — each link opens the chat preselected to that service. */}
        <div>
          <h4 className="ftr-heading">
            <Wrench width={14} height={14} aria-hidden />
            Servicios
          </h4>
          <button type="button" data-action="open-chat" data-service-id="cambio-aceite">Cambio de aceite</button>
          <button type="button" data-action="open-chat" data-service-id="frenos">Frenos</button>
          <button type="button" data-action="open-chat" data-service-id="pre-itv">Pre-ITV</button>
          <button type="button" data-action="open-chat" data-service-id="neumaticos">Neumáticos</button>
          <button type="button" data-action="open-chat" data-service-id="aire-acondicionado">Aire acondicionado</button>
          <button type="button" data-action="open-chat" data-service-id="diagnostico-obd">Diagnóstico OBD</button>
        </div>

        {/* Taller column */}
        <div>
          <h4 className="ftr-heading">
            <Building2 width={14} height={14} aria-hidden />
            Taller
          </h4>
          <Link href="/sobre-nosotros">Sobre nosotros</Link>
          <Link href="/como-trabajamos">Cómo trabajamos</Link>
          <Link href="/#visitanos">Visítanos</Link>
        </div>

        {/* Legal column */}
        <div>
          <h4 className="ftr-heading">
            <Scale width={14} height={14} aria-hidden />
            Legal
          </h4>
          <Link href="/aviso-legal">Aviso legal</Link>
          <Link href="/politica-de-privacidad">Privacidad</Link>
          <Link href="/politica-de-cookies">Cookies</Link>
          <Link href="/reclamaciones">Reclamaciones</Link>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="ftr-bottom">
        <span>© {foundingYear > 2026 ? foundingYear : 2026} Talleres AMG S.L.</span>
        <dl className="ftr-meta">
          <div>
            <dt>CIF</dt>
            <dd>{cif}</dd>
          </div>
          <div>
            <dt>Reg. Taller</dt>
            <dd>{regTaller}</dd>
          </div>
        </dl>
        <span>Hecho con cariño en Cartagena</span>
      </div>
    </footer>
  );
}
