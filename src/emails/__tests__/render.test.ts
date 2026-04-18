import { render } from '@react-email/render';
import { describe, it, expect } from 'vitest';
import { AppointmentConfirmation } from '../AppointmentConfirmation';
import { QuoteRequest } from '../QuoteRequest';
import { QuoteSent } from '../QuoteSent';
import { AppointmentReminder } from '../AppointmentReminder';
import { VehicleReady } from '../VehicleReady';

const BASE_URL = 'http://localhost:3000';
const PRIMARY = '#1a1a2e';

describe('Email templates render without throwing', () => {
  it('AppointmentConfirmation renders', async () => {
    const html = await render(
      AppointmentConfirmation({
        customerName: 'Carlos García',
        serviceName: 'Cambio de Aceite',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        plate: '1234 ABC',
        businessName: 'Talleres AMG',
        businessPhone: '+34 968 000 000',
        businessAddress: 'Polígono Industrial Cabezo Beaza, Calle Zinc 12, Cartagena',
        warrantyNote: 'Garantía de reparación: 3 meses o 2.000 km (RD 1457/1986)',
        cancelLink: `${BASE_URL}/cancelar`,
        baseUrl: BASE_URL,
        primaryColor: PRIMARY,
      }),
    );
    expect(html).toContain('Cita confirmada');
    expect(html).toContain('RD 1457/1986');
    expect(html).toContain('Carlos García');
    expect(html).toContain('Cambio de Aceite');
    expect(html).toContain('1234 ABC');
  });

  it('QuoteRequest renders', async () => {
    const html = await render(
      QuoteRequest({
        customerName: 'Ana Martínez',
        serviceType: 'Revisión Pre-ITV',
        vehicleDescription: 'Seat Ibiza 2018 1.0 TSI',
        businessName: 'Talleres AMG',
        businessPhone: '+34 968 000 000',
        validUntilStr: '22 de mayo de 2026',
        baseUrl: BASE_URL,
        primaryColor: PRIMARY,
      }),
    );
    expect(html).toContain('Solicitud de presupuesto recibida');
    expect(html).toContain('RD 1457/1986');
    expect(html).toContain('Ana Martínez');
    expect(html).toContain('Revisión Pre-ITV');
  });

  it('QuoteSent renders', async () => {
    const html = await render(
      QuoteSent({
        customerName: 'Pedro López',
        items: [
          { description: 'Cambio pastillas freno delanteras', qty: 1, unitPrice: 65.0, type: 'part' },
          { description: 'Mano de obra', qty: 1, unitPrice: 45.0, type: 'labour' },
        ],
        subtotal: 110.0,
        ivaRate: 0.21,
        total: 133.1,
        validUntilStr: '28 de mayo de 2026',
        approvalLink: `${BASE_URL}/aprobar?token=abc123`,
        businessName: 'Talleres AMG',
        baseUrl: BASE_URL,
        primaryColor: PRIMARY,
      }),
    );
    expect(html).toContain('presupuesto');
    expect(html).toContain('sin compromiso');
    expect(html).toContain('RD 1457/1986');
    expect(html).toContain('Pedro López');
    expect(html).toContain('Aceptar presupuesto');
  });

  it('AppointmentReminder renders', async () => {
    const html = await render(
      AppointmentReminder({
        customerName: 'María Sánchez',
        serviceName: 'Diagnóstico Electrónico',
        scheduledAt: '2026-05-11T10:30:00.000Z',
        plate: '5678 XYZ',
        businessName: 'Talleres AMG',
        businessAddress: 'Polígono Industrial Cabezo Beaza, Calle Zinc 12, Cartagena',
        rescheduleLink: `${BASE_URL}/reprogramar?token=xyz789`,
        cancelLink: `${BASE_URL}/cancelar?token=xyz789`,
        baseUrl: BASE_URL,
        primaryColor: PRIMARY,
      }),
    );
    expect(html).toContain('Recuerda tu cita');
    expect(html).toContain('María Sánchez');
    expect(html).toContain('Diagnóstico Electrónico');
    expect(html).toContain('Reprogramar');
    expect(html).toContain('Cancelar');
  });

  it('VehicleReady renders', async () => {
    const html = await render(
      VehicleReady({
        customerName: 'Luis Fernández',
        plate: '9012 DEF',
        servicesPerformed: ['Cambio de aceite y filtro', 'Revisión de frenos'],
        amountDue: 95.0,
        ivaRate: 0.21,
        businessName: 'Talleres AMG',
        businessPhone: '+34 968 000 000',
        businessHours: 'Lun–Vie 08:00–18:00 · Sáb 09:00–14:00',
        baseUrl: BASE_URL,
        primaryColor: PRIMARY,
      }),
    );
    expect(html).toContain('listo');
    expect(html).toContain('9012 DEF');
    expect(html).toContain('RD 1457/1986');
    expect(html).toContain('Luis Fernández');
  });
});
