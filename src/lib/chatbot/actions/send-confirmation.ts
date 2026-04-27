import type { ActionHandler } from '../engine';

// Placeholder — replace with real email/SMS provider
export const sendConfirmation: ActionHandler = async (params, session, pb, tenantId) => {
  const email = session.variables['customer_email'];

  // TODO: integrate email provider (Resend, Postmark, etc.) — needs name + tenant context.
  console.log(`[sendConfirmation] tenant=${tenantId}`);

  return { message: `Confirmación enviada a ${email ?? 'tu correo'}.` };
};
