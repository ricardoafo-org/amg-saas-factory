import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth', () => ({
  getStaffCtx: vi.fn().mockResolvedValue({
    tenantId: 'talleres-amg',
    pb: { collection: () => ({ create: vi.fn(), getList: vi.fn(), getOne: vi.fn() }), filter: (s: string) => s },
  }),
}));

vi.mock('twilio', () => ({
  default: vi.fn(() => ({ messages: { create: vi.fn() } })),
}));

import { sendSms, sendBulkSms } from '../sms';

describe('sendSms — input validation (Zod 4 issue path)', () => {
  it('returns the first Zod issue message on too-short phone', async () => {
    const result = await sendSms({ toPhone: '123', message: 'hola' });
    expect(result).toEqual({ ok: false, error: 'Teléfono inválido' });
  });

  it('returns the first Zod issue message on empty message', async () => {
    const result = await sendSms({ toPhone: '+34600000000', message: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // First issue is the min(1) on `message` — Zod's default message
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('returns issue message on message exceeding 480 chars (3-SMS limit)', async () => {
    const result = await sendSms({ toPhone: '+34600000000', message: 'x'.repeat(481) });
    expect(result).toEqual({ ok: false, error: 'Mensaje demasiado largo (máx 3 SMS)' });
  });
});

describe('sendBulkSms — input validation (Zod 4 issue path)', () => {
  it('returns issue message on empty customerIds', async () => {
    const result = await sendBulkSms({ customerIds: [], message: 'hola' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('returns issue message on more than 50 customerIds', async () => {
    const result = await sendBulkSms({
      customerIds: Array.from({ length: 51 }, (_, i) => `c${i}`),
      message: 'hola',
    });
    expect(result).toEqual({ ok: false, error: 'Máximo 50 SMS por envío masivo' });
  });
});
