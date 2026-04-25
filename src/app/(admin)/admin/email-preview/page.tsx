const TEMPLATES = [
  { slug: 'appointment', label: 'Confirmación de cita', description: 'Se envía al confirmar una cita desde el chatbot' },
  { slug: 'quote-request', label: 'Solicitud de presupuesto', description: 'Se envía al recibir una solicitud de presupuesto' },
  { slug: 'quote-sent', label: 'Presupuesto enviado', description: 'Se envía cuando el taller emite un presupuesto con líneas de detalle' },
  { slug: 'reminder', label: 'Recordatorio de cita', description: 'Se envía 24h antes de la cita' },
  { slug: 'vehicle-ready', label: 'Vehículo listo', description: 'Se envía cuando el vehículo está listo para recoger' },
] as const;

export default function EmailPreviewIndexPage() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
        Previsualización de plantillas de email
      </h1>
      <p style={{ color: 'var(--muted-fg)', fontSize: '14px', marginBottom: '32px' }}>
        Datos de prueba realistas. No se envían emails desde esta página.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {TEMPLATES.map((t) => (
          <a
            key={t.slug}
            href={`/admin/email-preview/${t.slug}`}
            style={{
              display: 'block',
              padding: '16px 20px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px', color: 'var(--fg)' }}>
              {t.label}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted-fg)' }}>{t.description}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
