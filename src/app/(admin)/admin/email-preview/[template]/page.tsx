import { render } from '@react-email/render';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppointmentConfirmation } from '@/emails/AppointmentConfirmation';
import { QuoteRequest } from '@/emails/QuoteRequest';
import { QuoteSent } from '@/emails/QuoteSent';
import { AppointmentReminder } from '@/emails/AppointmentReminder';
import { VehicleReady } from '@/emails/VehicleReady';
import { CopyHtmlButton } from './CopyHtmlButton';

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'http://localhost:3000';
const PRIMARY = '#1a1a2e';

const MOCK_DATE = '2026-05-15T10:00:00.000Z';
const VALID_UNTIL = '28 de mayo de 2026';

const TEMPLATES = ['appointment', 'quote-request', 'quote-sent', 'reminder', 'vehicle-ready'] as const;
type TemplateName = (typeof TEMPLATES)[number];

async function getHtml(template: TemplateName): Promise<string> {
  switch (template) {
    case 'appointment':
      return render(
        AppointmentConfirmation({
          customerName: 'Carlos García Pérez',
          serviceName: 'Cambio de Aceite + Revisión Pre-ITV',
          scheduledAt: MOCK_DATE,
          plate: '1234 ABC',
          businessName: 'Talleres AMG',
          businessPhone: '+34 968 000 000',
          businessAddress: 'Polígono Industrial Cabezo Beaza, Calle Zinc 12, Cartagena',
          warrantyNote: 'Garantía de reparación: 3 meses o 2.000 km (RD 1457/1986)',
          cancelLink: `${BASE_URL}/cancelar?token=demo`,
          baseUrl: BASE_URL,
          primaryColor: PRIMARY,
        }),
      );

    case 'quote-request':
      return render(
        QuoteRequest({
          customerName: 'Ana Martínez López',
          serviceType: 'Revisión Pre-ITV',
          vehicleDescription: 'Seat Ibiza 2018 1.0 TSI 95 CV',
          businessName: 'Talleres AMG',
          businessPhone: '+34 968 000 000',
          validUntilStr: VALID_UNTIL,
          baseUrl: BASE_URL,
          primaryColor: PRIMARY,
        }),
      );

    case 'quote-sent':
      return render(
        QuoteSent({
          customerName: 'Pedro López Gómez',
          items: [
            { description: 'Pastillas freno delanteras (juego)', qty: 1, unitPrice: 45.0, type: 'part' },
            { description: 'Discos freno delanteros (par)', qty: 1, unitPrice: 89.9, type: 'part' },
            { description: 'Mano de obra — sustitución frenos', qty: 1, unitPrice: 55.0, type: 'labour' },
          ],
          subtotal: 189.9,
          ivaRate: 0.21,
          total: 229.78,
          validUntilStr: VALID_UNTIL,
          approvalLink: `${BASE_URL}/aprobar?token=demo`,
          businessName: 'Talleres AMG',
          baseUrl: BASE_URL,
          primaryColor: PRIMARY,
        }),
      );

    case 'reminder':
      return render(
        AppointmentReminder({
          customerName: 'María Sánchez Ruiz',
          serviceName: 'Diagnóstico Electrónico',
          scheduledAt: MOCK_DATE,
          plate: '5678 XYZ',
          businessName: 'Talleres AMG',
          businessAddress: 'Polígono Industrial Cabezo Beaza, Calle Zinc 12, Cartagena',
          rescheduleLink: `${BASE_URL}/reprogramar?token=demo`,
          cancelLink: `${BASE_URL}/cancelar?token=demo`,
          baseUrl: BASE_URL,
          primaryColor: PRIMARY,
        }),
      );

    case 'vehicle-ready':
      return render(
        VehicleReady({
          customerName: 'Luis Fernández Castro',
          plate: '9012 DEF',
          servicesPerformed: [
            'Cambio de aceite y filtro (sintético 5W-40)',
            'Revisión y sustitución pastillas freno delanteras',
            'Diagnóstico electrónico OBD',
          ],
          amountDue: 149.97,
          ivaRate: 0.21,
          businessName: 'Talleres AMG',
          businessPhone: '+34 968 000 000',
          businessHours: 'Lun–Vie 08:00–18:00 · Sáb 09:00–14:00',
          baseUrl: BASE_URL,
          primaryColor: PRIMARY,
        }),
      );
  }
}

const TEMPLATE_LABELS: Record<TemplateName, string> = {
  appointment: 'Confirmación de cita',
  'quote-request': 'Solicitud de presupuesto',
  'quote-sent': 'Presupuesto enviado',
  reminder: 'Recordatorio de cita',
  'vehicle-ready': 'Vehículo listo',
};

export default async function EmailPreviewPage({
  params,
}: {
  params: Promise<{ template: string }>;
}) {
  const { template } = await params;

  if (!TEMPLATES.includes(template as TemplateName)) {
    notFound();
  }

  const name = template as TemplateName;
  const html = await getHtml(name);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '0' }}>
      <div
        style={{
          background: '#1a1a2e',
          color: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/admin/email-preview"
            style={{ color: '#aaa', fontSize: '13px', textDecoration: 'none' }}
          >
            ← Todos los templates
          </Link>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
            {TEMPLATE_LABELS[name]}
          </span>
        </div>
        <CopyHtmlButton html={html} />
      </div>

      <iframe
        srcDoc={html}
        style={{
          width: '100%',
          height: 'calc(100vh - 50px)',
          border: 'none',
          display: 'block',
        }}
        title={`Preview: ${TEMPLATE_LABELS[name]}`}
      />
    </div>
  );
}

export function generateStaticParams() {
  return TEMPLATES.map((template) => ({ template }));
}
