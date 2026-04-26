import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Archivo, Archivo_Black } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { CookieBanner } from '@/core/components/CookieBanner';
import { InstallPrompt } from '@/core/components/pwa/InstallPrompt';
import { loadClientConfig } from '@/lib/config';
import { getTenantId } from '@/lib/tenant';
import './globals.css';

const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo-black',
});

const archivo = Archivo({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo',
});

const TENANT_ID = getTenantId();
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
    <html
      lang="es"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${archivoBlack.variable} ${archivo.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
          {children}
          <CookieBanner />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
