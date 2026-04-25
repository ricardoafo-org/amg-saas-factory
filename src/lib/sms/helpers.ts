// ---------------------------------------------------------------------------
// SMS Templates
// ---------------------------------------------------------------------------

export const SMS_TEMPLATES = {
  recordatorio_cita: {
    id: 'recordatorio_cita',
    label: 'Recordatorio de cita',
    body: 'Hola {nombre}, recuerda tu cita en {taller} mañana {fecha} a las {hora}. Reprogramar: {link}. Resp. STOP para cancelar.',
  },
  vehiculo_listo: {
    id: 'vehiculo_listo',
    label: 'Vehículo listo',
    body: 'Hola {nombre}, tu vehículo {plate} ya está listo para recoger en {taller}. Horario: {hours}. Resp. STOP para cancelar.',
  },
  presupuesto_enviado: {
    id: 'presupuesto_enviado',
    label: 'Presupuesto enviado',
    body: 'Hola {nombre}, hemos preparado tu presupuesto ({total}€). Revísalo: {link}. Resp. STOP para cancelar.',
  },
  itv_proximo: {
    id: 'itv_proximo',
    label: 'ITV próxima a vencer',
    body: 'Hola {nombre}, la ITV de tu {plate} vence el {fecha}. ¿Reservamos revisión previa? {bookingLink}. Resp. STOP para cancelar.',
  },
} as const;

export type SmsTemplateId = keyof typeof SMS_TEMPLATES;

// ---------------------------------------------------------------------------

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
