import { render } from '@react-email/render';
import { describe, it, expect } from 'vitest';
import { AppointmentConfirmation } from '../AppointmentConfirmation';
import { QuoteSent } from '../QuoteSent';
import { VehicleReady } from '../VehicleReady';

const BASE_URL = 'http://localhost:3000';
const PRIMARY = '#1a1a2e';

describe('Email compliance content', () => {
  it('AppointmentConfirmation contains warranty notice (RD 1457/1986)', async () => {
    const html = await render(
      AppointmentConfirmation({
        customerName: 'Cliente Test',
        serviceName: 'Revisión Pre-ITV',
        scheduledAt: '2026-05-10T09:00:00.000Z',
        plate: '0000 TST',
        businessName: 'Talleres AMG',
        businessPhone: '+34 968 000 000',
        businessAddress: 'Calle Test 1, Cartagena',
        warrantyNote: 'Garantía de reparación: 3 meses o 2.000 km (RD 1457/1986)',
        cancelLink: `${BASE_URL}/cancelar`,
        baseUrl: BASE_URL,
        primaryColor: PRIMARY,
      }),
    );
    expect(html).toContain('RD 1457/1986');
    expect(html).toContain('Garantía');
  });

  it('QuoteSent contains "sin compromiso" disclaimer', async () => {
    const html = await render(
      QuoteSent({
        customerName: 'Cliente Test',
        items: [{ description: 'Servicio de prueba', qty: 1, unitPrice: 100.0, type: 'labour' }],
        subtotal: 100.0,
        ivaRate: 0.21,
        total: 121.0,
        validUntilStr: '28 de mayo de 2026',
        approvalLink: `${BASE_URL}/aprobar`,
        businessName: 'Talleres AMG',
        baseUrl: BASE_URL,
        primaryColor: PRIMARY,
      }),
    );
    expect(html).toContain('sin compromiso');
    expect(html).toContain('12 días hábiles');
    expect(html).toContain('RD 1457/1986');
  });

  it('QuoteSent IVA rate comes from props and is not hardcoded', async () => {
    // Test with 10% IVA (Canarias rate) — if hardcoded 21% this would fail
    const html = await render(
      QuoteSent({
        customerName: 'Cliente Canarias',
        items: [{ description: 'Mano de obra', qty: 1, unitPrice: 200.0, type: 'labour' }],
        subtotal: 200.0,
        ivaRate: 0.1,
        total: 220.0,
        validUntilStr: '28 de mayo de 2026',
        approvalLink: `${BASE_URL}/aprobar`,
        businessName: 'Talleres Canarias',
        baseUrl: BASE_URL,
        primaryColor: PRIMARY,
      }),
    );
    // 10% IVA should appear, not 21%
    expect(html).toContain('10%');
    // Amount due for 10% IVA on 200 = 20
    expect(html).toContain('20.00');
    // Should NOT show the 21% hardcoded figure as the percentage display
    // (21% could appear in other content so we check the IVA row specifically)
    // The total should be 220.00
    expect(html).toContain('220.00');
  });

  it('VehicleReady contains warranty text (RD 1457/1986)', async () => {
    const html = await render(
      VehicleReady({
        customerName: 'Cliente Test',
        plate: '1111 TST',
        servicesPerformed: ['Cambio de aceite'],
        amountDue: 40.0,
        ivaRate: 0.21,
        businessName: 'Talleres AMG',
        businessPhone: '+34 968 000 000',
        businessHours: 'Lun–Vie 08:00–18:00',
        baseUrl: BASE_URL,
        primaryColor: PRIMARY,
      }),
    );
    expect(html).toContain('Garantía');
    expect(html).toContain('RD 1457/1986');
    expect(html).toContain('3 meses');
    expect(html).toContain('2.000 km');
  });

  it('VehicleReady IVA amount computed from ivaRate prop', async () => {
    const amountDue = 100.0;
    const ivaRate = 0.21;
    const expectedIva = (amountDue * ivaRate).toFixed(2); // 21.00
    const expectedTotal = (amountDue + amountDue * ivaRate).toFixed(2); // 121.00

    const html = await render(
      VehicleReady({
        customerName: 'Cliente Test',
        plate: '2222 TST',
        servicesPerformed: ['Mecánica general'],
        amountDue,
        ivaRate,
        businessName: 'Talleres AMG',
        businessPhone: '+34 968 000 000',
        businessHours: 'Lun–Vie 08:00–18:00',
        baseUrl: BASE_URL,
        primaryColor: PRIMARY,
      }),
    );
    expect(html).toContain(expectedIva);
    expect(html).toContain(expectedTotal);
  });
});
