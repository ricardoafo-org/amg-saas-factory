'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  ClipboardList,
  Users,
  Car,
  FileText,
  MessageSquare,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Hoy',            href: '/admin/today',          icon: Home },
  { label: 'Calendario',     href: '/admin/calendar',       icon: Calendar },
  { label: 'Citas',          href: '/admin/appointments',   icon: ClipboardList },
  { label: 'Clientes',       href: '/admin/customers',      icon: Users },
  { label: 'Vehículos',      href: '/admin/vehicles',       icon: Car },
  { label: 'Presupuestos',   href: '/admin/quotes',         icon: FileText },
  { label: 'Comunicaciones', href: '/admin/communications', icon: MessageSquare },
  { label: 'Informes',       href: '/admin/reports',        icon: BarChart2 },
  { label: 'Configuración',  href: '/admin/settings',       icon: Settings },
];

// Top 5 items shown in mobile tab bar; rest accessible via "Más" sheet
const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 5);

type SidebarProps = {
  displayName: string;
  role: string;
};

export function Sidebar({ displayName, role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen sticky top-0 glass border-r border-border transition-all duration-200 shrink-0 z-30',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        {/* Logo row */}
        <div className={cn('flex items-center gap-2 px-3 py-4 border-b border-border', collapsed && 'justify-center px-0')}>
          {!collapsed && (
            <span className="text-sm font-semibold text-foreground truncate flex-1 pl-1">
              AMG Talleres
            </span>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <ul className="space-y-0.5 px-1.5">
            {NAV_ITEMS.map((item) => (
              <SidebarItem key={item.href} item={item} collapsed={collapsed} active={pathname.startsWith(item.href)} />
            ))}
          </ul>
        </nav>

        {/* User footer */}
        <div className={cn('border-t border-border px-2 py-3', collapsed && 'flex justify-center')}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border z-40 safe-area-inset-bottom">
        <ul className="flex items-center justify-around h-16">
          {MOBILE_PRIMARY.map((item) => (
            <MobileTabItem key={item.href} item={item} active={pathname.startsWith(item.href)} />
          ))}
          {/* "Más" button */}
          <li>
            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 text-muted-foreground"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs">Más</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ── Mobile "Más" sheet ── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setMoreOpen(false)}
            aria-label="Cerrar menú"
          />
          <div className="relative glass-strong rounded-t-2xl p-4 pb-8">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <ul className="space-y-1">
              {NAV_ITEMS.slice(5).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors',
                      pathname.startsWith(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function SidebarItem({ item, collapsed, active }: { item: NavItem; collapsed: boolean; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors',
          collapsed && 'justify-center px-2',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );
}

function MobileTabItem({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'flex flex-col items-center gap-0.5 px-3 py-2 transition-colors',
          active ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <item.icon className="h-5 w-5" />
        <span className="text-xs">{item.label}</span>
      </Link>
    </li>
  );
}
