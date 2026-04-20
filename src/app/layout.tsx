import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from 'next-themes';
import { CookieBanner } from '@/core/components/CookieBanner';
import { loadClientConfig } from '@/lib/config';
import './globals.css';

const TENANT_ID = process.env['TENANT_ID'] ?? 'talleres-amg';
const config = loadClientConfig(TENANT_ID);

export const metadata: Metadata = {
  title: config.businessName,
  description: `${config.tagline ?? 'Tu taller de confianza'} — ${config.address.city}`,
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  manifest: '/manifest.webmanifest',
  themeColor: config.branding.primaryColor,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: config.businessName,
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
