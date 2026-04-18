import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from 'next-themes';
import { CookieBanner } from '@/core/components/CookieBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Talleres AMG',
  description: 'Tu taller de confianza en Cartagena — Mecánica, ITV, Cambios de Aceite',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  manifest: '/manifest.webmanifest',
  themeColor: '#e11d48',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Talleres AMG',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
          {children}
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
