'use server';

import { getPb } from '@/lib/pb';
import { loadClientConfig } from '@/lib/config';

type CookieConsentData = {
  analytics: boolean;
  marketing: boolean;
  sessionId: string;
  userAgent: string;
};

/**
 * Log cookie consent to PocketBase for AEPD audit trail.
 * Silent fail — the banner must never crash the page.
 */
export async function logCookieConsent(data: CookieConsentData): Promise<void> {
  try {
    const config = loadClientConfig(process.env['TENANT_ID'] ?? 'talleres-amg');
    const pb = await getPb();

    await pb.collection('cookie_consents').create({
      tenant_id: config.tenantId,
      session_id: data.sessionId,
      analytics: data.analytics,
      marketing: data.marketing,
      consented_at: new Date().toISOString(),
      user_agent: data.userAgent,
    });
  } catch {
    // Silent fail — consent banner must never crash the page
  }
}
