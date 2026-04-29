import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ set: vi.fn(), delete: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('REDIRECT');
  }),
}));

vi.mock('pocketbase', () => ({
  default: vi.fn(function () {
    return {
      collection: () => ({ authWithPassword: vi.fn().mockRejectedValue(new Error('auth fail')) }),
      authStore: { isValid: false, token: '' },
    };
  }),
}));

import { loginStaff } from '../admin-auth';

describe('loginStaff — input validation (Zod 4 issue path)', () => {
  it('returns the first Zod issue message on missing email', async () => {
    const fd = new FormData();
    fd.set('email', '');
    fd.set('password', 'secret');

    const result = await loginStaff({ success: false, error: '' }, fd);
    expect(result).toEqual({ success: false, error: 'Email inválido' });
  });

  it('returns the first Zod issue message on missing password', async () => {
    const fd = new FormData();
    fd.set('email', 'admin@example.com');
    fd.set('password', '');

    const result = await loginStaff({ success: false, error: '' }, fd);
    expect(result).toEqual({ success: false, error: 'Contraseña requerida' });
  });

  it('returns "Email inválido" for malformed email', async () => {
    const fd = new FormData();
    fd.set('email', 'not-an-email');
    fd.set('password', 'secret');

    const result = await loginStaff({ success: false, error: '' }, fd);
    expect(result).toEqual({ success: false, error: 'Email inválido' });
  });

  it('passes validation with valid email + password (then fails downstream auth, expected)', async () => {
    const fd = new FormData();
    fd.set('email', 'admin@example.com');
    fd.set('password', 'secret');

    const result = await loginStaff({ success: false, error: '' }, fd);
    // PB mock rejects authWithPassword → falls through to "credenciales incorrectas"
    expect(result).toEqual({
      success: false,
      error: 'Credenciales incorrectas. Verifica tu email y contraseña.',
    });
  });
});
