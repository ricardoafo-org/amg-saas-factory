import Image from 'next/image';
import type { LocalBusiness } from '@/core/types/adapter';

export function Footer({ config }: { config: LocalBusiness }) {
  const { businessName } = config;

  return (
    <footer className="ftr">
      {/* 4-column inner grid: brand · Servicios · Taller · Legal */}
      <div className="ftr-inner">
        {/* Brand column */}
        <div className="ftr-brand">
          <Image src="/logo.svg" alt={businessName} width={120} height={38} style={{ height: 38, width: 'auto' }} />
          <p>
            Taller mecánico familiar en Cartagena. Desde 1987 cuidamos los coches del barrio como si fueran nuestros.
          </p>
        </div>

        {/* Servicios column */}
        <div>
          <h4>Servicios</h4>
          <a href="#servicios">Cambio de aceite</a>
          <a href="#servicios">Frenos</a>
          <a href="#servicios">Pre-ITV</a>
          <a href="#servicios">Neumáticos</a>
          <a href="#servicios">Aire acondicionado</a>
          <a href="#servicios">Diagnóstico OBD</a>
        </div>

        {/* Taller column */}
        <div>
          <h4>Taller</h4>
          <a href="#nosotros">Sobre nosotros</a>
          <a href="#nosotros">Cómo trabajamos</a>
          <a href="#visitanos">Visítanos</a>
        </div>

        {/* Legal column */}
        <div>
          <h4>Legal</h4>
          <a href="/aviso-legal">Aviso legal</a>
          <a href="/politica-de-privacidad">Privacidad</a>
          <a href="/politica-de-cookies">Cookies</a>
          <a href="/reclamaciones">Reclamaciones</a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="ftr-bottom">
        <span>© 2026 Talleres AMG S.L. · CIF B30123456 · Reg. Taller 30/456</span>
        <span>Hecho con cariño en Cartagena</span>
      </div>
    </footer>
  );
}
