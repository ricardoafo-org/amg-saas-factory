'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Search, Plus, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { logoutStaff } from '@/actions/admin-auth';

const PATH_LABELS: Record<string, string> = {
  '/admin/today':          'Hoy',
  '/admin/calendar':       'Calendario',
  '/admin/appointments':   'Citas',
  '/admin/customers':      'Clientes',
  '/admin/vehicles':       'Vehículos',
  '/admin/quotes':         'Presupuestos',
  '/admin/communications': 'Comunicaciones',
  '/admin/reports':        'Informes',
  '/admin/settings':       'Configuración',
};

function getBreadcrumb(pathname: string): string {
  for (const [path, label] of Object.entries(PATH_LABELS)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return label;
    }
  }
  return 'Admin';
}

type TopbarProps = {
  displayName: string;
};

export function Topbar({ displayName }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const breadcrumb = getBreadcrumb(pathname);

  function handleLogout() {
    startTransition(async () => {
      await logoutStaff();
    });
  }

  return (
    <header className="glass border-b border-border sticky top-0 z-20 h-14 flex items-center px-4 gap-3">
      {/* Breadcrumb */}
      <h1 className="text-sm font-semibold text-foreground flex-1 truncate">
        {breadcrumb}
      </h1>

      {/* Global search */}
      <div className="hidden sm:flex items-center gap-2 bg-muted rounded-lg px-3 h-8 w-56 border border-border">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="search"
          placeholder="Buscar cliente o matrícula…"
          className={cn(
            'flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground',
            'border-0 outline-none focus:outline-none',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = (e.target as HTMLInputElement).value.trim();
              if (val) router.push(`/admin/search?q=${encodeURIComponent(val)}`);
            }
          }}
        />
      </div>

      {/* Nueva cita CTA */}
      <a
        href="/admin/appointments/new"
        className={cn(
          'hidden sm:flex items-center gap-1.5 bg-primary text-primary-foreground',
          'px-3 h-8 rounded-lg text-xs font-medium transition-opacity hover:opacity-90',
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        Nueva cita
      </a>

      {/* Mobile: icon-only nueva cita */}
      <a
        href="/admin/appointments/new"
        aria-label="Nueva cita"
        className="sm:hidden flex items-center justify-center bg-primary text-primary-foreground w-8 h-8 rounded-lg"
      >
        <Plus className="h-4 w-4" />
      </a>

      {/* User avatar + logout */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
