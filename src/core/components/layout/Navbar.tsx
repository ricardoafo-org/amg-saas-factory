import Link from 'next/link';
import { Phone, CalendarCheck } from 'lucide-react';
import type { LocalBusiness } from '@/core/types/adapter';
import { Logo } from '@/core/components/brand/Logo';
import { NavbarScrollEffect } from './NavbarScrollEffect';

const NAV_ITEMS = [
  { href: '#servicios', label: 'Servicios' },
  { href: '#itv', label: 'ITV' },
  { href: '/proceso', label: 'Proceso' },
  { href: '#visitanos', label: 'Visítanos' },
] as const;

export function Navbar({ config }: { config: LocalBusiness }) {
  const { businessName, contact } = config;

  return (
    <header className="nav" data-scrolled="false">
      <div className="nav-inner">
        <Link href="/" className="nav-logo" aria-label={businessName}>
          <Logo variant="lockup" size={36} ariaLabel={businessName} />
        </Link>

        <nav className="nav-links" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-right">
          <a className="nav-phone" href={`tel:${contact.phone}`}>
            <Phone width={16} height={16} aria-hidden />
            <span>{contact.phone}</span>
          </a>
          <button
            type="button"
            data-action="open-chat"
            aria-label="Reservar cita"
            className="open-chat-trigger btn btn-primary btn-sm"
          >
            <CalendarCheck width={14} height={14} aria-hidden />
            Reservar cita
          </button>
        </div>
      </div>
      <NavbarScrollEffect />
    </header>
  );
}
