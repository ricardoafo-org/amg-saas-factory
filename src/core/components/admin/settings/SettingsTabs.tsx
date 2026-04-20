'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

export type TabId = 'negocio' | 'horarios' | 'servicios' | 'personal' | 'notificaciones';

const TABS: { id: TabId; label: string }[] = [
  { id: 'negocio', label: 'Negocio' },
  { id: 'horarios', label: 'Horarios' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'personal', label: 'Personal' },
  { id: 'notificaciones', label: 'Notificaciones' },
];

type Props = {
  children: (activeTab: TabId) => React.ReactNode;
};

export function SettingsTabs({ children }: Props) {
  const [active, setActive] = useState<TabId>('negocio');

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
              active === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {children(active)}
    </div>
  );
}
