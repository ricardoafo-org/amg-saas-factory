/** Mask a phone number — keep only last 4 digits visible. e.g. +34 6** *** **34 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  const last4 = digits.slice(-4);
  const prefix = phone.startsWith('+') ? '+' : '';
  // Build masked version: +XX 6** *** **XX
  if (digits.length >= 11) {
    const countryCode = digits.slice(0, digits.length - 9);
    return `${prefix}${countryCode} 6** *** **${last4.slice(-2)}`;
  }
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${last4}`;
}

/** Interpolate SMS template variables */
export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}
