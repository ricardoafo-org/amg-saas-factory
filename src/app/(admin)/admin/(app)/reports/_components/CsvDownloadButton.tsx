'use client';

import { Download } from 'lucide-react';
import { bookingsToCsvRows, rowsToCsvString } from '@/lib/reports/csv';
import type { Booking } from '@/types/pb';

type Props = {
  bookings: Booking[];
};

export function CsvDownloadButton({ bookings }: Props) {
  function handleDownload() {
    const rows = bookingsToCsvRows(bookings);
    const csv = rowsToCsvString(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground border border-border hover:bg-muted transition-colors"
    >
      <Download className="h-4 w-4" />
      Descargar CSV
    </button>
  );
}
