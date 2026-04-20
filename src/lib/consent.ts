const CONSENT_KEY = 'amg_cookie_consent';

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    return JSON.parse(raw).analytics === true;
  } catch {
    return false;
  }
}

export function hasMarketingConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    return JSON.parse(raw).marketing === true;
  } catch {
    return false;
  }
}
