import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted — must appear before any import that uses them) ────

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
  cookies: vi.fn().mockResolvedValue({
    toString: vi.fn().mockReturnValue(''),
    get: vi.fn(),
  }),
}));

vi.mock('@/lib/config', () => ({
  loadClientConfig: vi.fn().mockReturnValue({
    businessName: 'Talleres AMG Test',
    contact: { phone: '+34 000 000 000' },
    address: { street: 'Calle Test', city: 'Murcia' },
    branding: { primaryColor: '#c0392b' },
  }),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
    },
  })),
}));

vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('@/emails/AppointmentConfirmation', () => ({
  AppointmentConfirmation: vi.fn().mockReturnValue(null),
}));

vi.mock('@/emails/QuoteRequest', () => ({
  QuoteRequest: vi.fn().mockReturnValue(null),
}));

// ── PocketBase mock factory ──────────────────────────────────────────────────

// We build a fresh mock pb for each test so call order / state doesn't leak.
function makeMockPb({
  consentLogCreate = vi.fn().mockResolvedValue({ id: 'consent-1' }),
  configGetFirstListItem = vi.fn(),
  customersGetFirstListItem = vi.fn(),
  customersCreate = vi.fn(),
  customersGetOne = vi.fn(),
  customersUpdate = vi.fn(),
  servicesGetList = vi.fn().mockResolvedValue({ items: [] }),
  appointmentsCreate = vi.fn().mockResolvedValue({ id: 'appt-1' }),
}: {
  consentLogCreate?: ReturnType<typeof vi.fn>;
  configGetFirstListItem?: ReturnType<typeof vi.fn>;
  customersGetFirstListItem?: ReturnType<typeof vi.fn>;
  customersCreate?: ReturnType<typeof vi.fn>;
  customersGetOne?: ReturnType<typeof vi.fn>;
  customersUpdate?: ReturnType<typeof vi.fn>;
  servicesGetList?: ReturnType<typeof vi.fn>;
  appointmentsCreate?: ReturnType<typeof vi.fn>;
} = {}) {
  // Simulate pb.filter() — mirrors the real SDK: replaces {:key} with the value (no escaping needed in tests)
  const filterFn = vi.fn((template: string, params: Record<string, string>) => {
    return template.replace(/\{:(\w+)\}/g, (_, key) => params[key] ?? '');
  });

  return {
    filter: filterFn,
    collection: vi.fn((name: string) => {
      if (name === 'consent_log') return { create: consentLogCreate };
      if (name === 'config') return { getFirstListItem: configGetFirstListItem };
      if (name === 'customers') {
        return {
          getFirstListItem: customersGetFirstListItem,
          create: customersCreate,
          getOne: customersGetOne,
          update: customersUpdate,
        };
      }
      if (name === 'services') return { getList: servicesGetList };
      if (name === 'appointments') return { create: appointmentsCreate };
      throw new Error(`Unexpected collection: ${name}`);
    }),
  };
}

vi.mock('@/lib/pb', () => ({
  getPb: vi.fn(),
}));

// Import after mocks are registered
import { saveAppointment } from '../chatbot';
import { getPb } from '@/lib/pb';

// ── Test helpers ─────────────────────────────────────────────────────────────

const BASE_PAYLOAD = {
  tenantId: 'tenant-amg',
  matricula: '1234ABC',
  fuelType: 'gasolina',
  fechaPreferida: '2026-05-10T10:00:00.000Z',
  customerName: 'Ana García',
  customerPhone: '+34 600 000 001',
  customerEmail: 'ANA@EXAMPLE.COM', // intentionally mixed-case to test normalisation
  serviceIds: [],
  policyVersion: 'v1',
  policyHash: 'abc123',
  userAgent: 'test-agent',
};

function makeConfigGetFirstListItem(ivaValue = '0.21') {
  return vi.fn().mockImplementation((filter: string) => {
    if (filter.includes('iva_rate')) return Promise.resolve({ value: ivaValue });
    if (filter.includes('business_name')) return Promise.reject(new Error('not found'));
    return Promise.reject(new Error('not found'));
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('saveAppointment — find-or-create customer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new customer when none matches tenant + email', async () => {
    const customersCreate = vi.fn().mockResolvedValue({ id: 'cust-new' });
    const customersGetFirstListItem = vi.fn().mockRejectedValue(new Error('not found'));
    const customersGetOne = vi.fn().mockResolvedValue({ total_visits: 0, total_spent: 0 });
    const customersUpdate = vi.fn().mockResolvedValue({});

    const mockPb = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem,
      customersCreate,
      customersGetOne,
      customersUpdate,
    });

    vi.mocked(getPb).mockResolvedValue(mockPb as never);

    await saveAppointment(BASE_PAYLOAD);

    expect(customersGetFirstListItem).toHaveBeenCalledOnce();
    expect(customersCreate).toHaveBeenCalledOnce();
    const createArgs = customersCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(createArgs['email']).toBe('ana@example.com');
    expect(createArgs['tenant_id']).toBe('tenant-amg');
  });

  it('reuses an existing customer on second booking with same email', async () => {
    const customersGetFirstListItem = vi.fn().mockResolvedValue({ id: 'cust-existing' });
    const customersCreate = vi.fn();
    const customersGetOne = vi.fn().mockResolvedValue({ total_visits: 3, total_spent: 150 });
    const customersUpdate = vi.fn().mockResolvedValue({});

    const mockPb = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem,
      customersCreate,
      customersGetOne,
      customersUpdate,
    });

    vi.mocked(getPb).mockResolvedValue(mockPb as never);

    await saveAppointment(BASE_PAYLOAD);

    expect(customersCreate).not.toHaveBeenCalled();
    expect(customersGetFirstListItem).toHaveBeenCalledOnce();
  });

  it('different tenant + same email creates two separate customer rows', async () => {
    const createA = vi.fn().mockResolvedValue({ id: 'cust-tenant-a' });
    const createB = vi.fn().mockResolvedValue({ id: 'cust-tenant-b' });
    const notFound = vi.fn().mockRejectedValue(new Error('not found'));
    const getOne = vi.fn().mockResolvedValue({ total_visits: 0, total_spent: 0 });
    const update = vi.fn().mockResolvedValue({});

    const pbA = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem: notFound,
      customersCreate: createA,
      customersGetOne: getOne,
      customersUpdate: update,
    });
    const pbB = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem: vi.fn().mockRejectedValue(new Error('not found')),
      customersCreate: createB,
      customersGetOne: getOne,
      customersUpdate: update,
    });

    vi.mocked(getPb)
      .mockResolvedValueOnce(pbA as never)
      .mockResolvedValueOnce(pbB as never);

    await saveAppointment({ ...BASE_PAYLOAD, tenantId: 'tenant-a' });
    await saveAppointment({ ...BASE_PAYLOAD, tenantId: 'tenant-b' });

    // Each tenant gets its own create call with its own tenant_id
    expect(createA).toHaveBeenCalledOnce();
    expect(createB).toHaveBeenCalledOnce();
    expect((createA.mock.calls[0][0] as Record<string, unknown>)['tenant_id']).toBe('tenant-a');
    expect((createB.mock.calls[0][0] as Record<string, unknown>)['tenant_id']).toBe('tenant-b');
  });
});

describe('saveAppointment — aggregate updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('increments total_visits by 1 after each booking', async () => {
    const customersGetOne = vi.fn().mockResolvedValue({ total_visits: 4, total_spent: 200 });
    const customersUpdate = vi.fn().mockResolvedValue({});

    const mockPb = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem: vi.fn().mockResolvedValue({ id: 'cust-1' }),
      customersGetOne,
      customersUpdate,
    });

    vi.mocked(getPb).mockResolvedValue(mockPb as never);

    await saveAppointment(BASE_PAYLOAD);

    expect(customersUpdate).toHaveBeenCalledOnce();
    const updateArgs = customersUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect(updateArgs['total_visits']).toBe(5);
  });

  it('increments total_spent by total_amount (base × (1 + iva))', async () => {
    const customersGetOne = vi.fn().mockResolvedValue({ total_visits: 0, total_spent: 100 });
    const customersUpdate = vi.fn().mockResolvedValue({});
    const servicesGetList = vi.fn().mockResolvedValue({
      items: [{ base_price: '50', name: 'Cambio aceite' }],
    });

    const mockPb = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem('0.21'),
      customersGetFirstListItem: vi.fn().mockResolvedValue({ id: 'cust-1' }),
      customersGetOne,
      customersUpdate,
      servicesGetList,
    });

    vi.mocked(getPb).mockResolvedValue(mockPb as never);

    await saveAppointment({ ...BASE_PAYLOAD, serviceIds: ['svc-1'] });

    expect(customersUpdate).toHaveBeenCalledOnce();
    const updateArgs = customersUpdate.mock.calls[0][1] as Record<string, unknown>;
    // base_price=50, iva=0.21 → total=60.5; existing total_spent=100 → 160.5
    expect(updateArgs['total_spent']).toBeCloseTo(160.5, 2);
  });
});

describe('saveAppointment — LOPDGDD consent-first invariant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consent_log is created before customer find-or-create', async () => {
    const callOrder: string[] = [];

    const consentLogCreate = vi.fn().mockImplementation(() => {
      callOrder.push('consent_log');
      return Promise.resolve({ id: 'consent-1' });
    });
    const customersGetFirstListItem = vi.fn().mockImplementation(() => {
      callOrder.push('customers_lookup');
      return Promise.reject(new Error('not found'));
    });
    const customersCreate = vi.fn().mockImplementation(() => {
      callOrder.push('customers_create');
      return Promise.resolve({ id: 'cust-new' });
    });
    const customersGetOne = vi.fn().mockResolvedValue({ total_visits: 0, total_spent: 0 });
    const customersUpdate = vi.fn().mockResolvedValue({});

    const mockPb = makeMockPb({
      consentLogCreate,
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem,
      customersCreate,
      customersGetOne,
      customersUpdate,
    });

    vi.mocked(getPb).mockResolvedValue(mockPb as never);

    await saveAppointment(BASE_PAYLOAD);

    expect(callOrder[0]).toBe('consent_log');
    expect(callOrder.indexOf('customers_lookup')).toBeGreaterThan(
      callOrder.indexOf('consent_log'),
    );
  });
});

describe('saveAppointment — email (Resend) resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('booking still completes and resolves when RESEND_API_KEY is absent', async () => {
    // Delete the env var for this test, restore after.
    const original = process.env['RESEND_API_KEY'];
    delete process.env['RESEND_API_KEY'];

    const appointmentsCreate = vi.fn().mockResolvedValue({ id: 'appt-ok' });
    const mockPb = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem: vi.fn().mockResolvedValue({ id: 'cust-1' }),
      customersGetOne: vi.fn().mockResolvedValue({ total_visits: 0, total_spent: 0 }),
      customersUpdate: vi.fn().mockResolvedValue({}),
      appointmentsCreate,
    });

    vi.mocked(getPb).mockResolvedValue(mockPb as never);

    // Must resolve (not throw) even with no API key configured
    await expect(saveAppointment(BASE_PAYLOAD)).resolves.not.toThrow();
    // The appointment MUST still be written — email is non-fatal
    expect(appointmentsCreate).toHaveBeenCalledOnce();

    // Resend constructor must NOT have been called (early-return guard in sendBookingConfirmation)
    const { Resend } = await import('resend');
    expect(Resend).not.toHaveBeenCalled();

    process.env['RESEND_API_KEY'] = original;
  });
});

describe('saveAppointment — failure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when customer create fails — appointment row is NOT written', async () => {
    const appointmentsCreate = vi.fn();
    const customersCreate = vi.fn().mockRejectedValue(new Error('DB error'));

    const mockPb = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem: vi.fn().mockRejectedValue(new Error('not found')),
      customersCreate,
      appointmentsCreate,
    });

    vi.mocked(getPb).mockResolvedValue(mockPb as never);

    await expect(saveAppointment(BASE_PAYLOAD)).rejects.toThrow();
    expect(appointmentsCreate).not.toHaveBeenCalled();
  });

  it('sanitizes error on customer create failure — thrown message contains no PII', async () => {
    const customerEmail = BASE_PAYLOAD.customerEmail;
    const customerPhone = BASE_PAYLOAD.customerPhone;
    const customerName = BASE_PAYLOAD.customerName;
    // PB might embed the rejected payload in the error message
    const rawPbError = new Error(
      `Create failed: email=${customerEmail} phone=${customerPhone} name=${customerName}`,
    );
    const customersCreate = vi.fn().mockRejectedValue(rawPbError);

    const mockPb = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem: vi.fn().mockRejectedValue(new Error('not found')),
      customersCreate,
    });

    vi.mocked(getPb).mockResolvedValue(mockPb as never);

    let caughtError: Error | undefined;
    try {
      await saveAppointment(BASE_PAYLOAD);
    } catch (err) {
      caughtError = err instanceof Error ? err : new Error(String(err));
    }

    expect(caughtError).toBeDefined();
    expect(caughtError!.message).not.toContain(customerEmail);
    expect(caughtError!.message).not.toContain(customerPhone);
    expect(caughtError!.message).not.toContain(customerName);
    expect(caughtError!.message).toBe('customer_create_failed');
  });

  it('filter-injection attempt via email does NOT match customer in different tenant', async () => {
    // Attacker-supplied email with PB filter metacharacters
    const injectionEmail = 'victim@real.com" || "1"="1';
    const customersGetFirstListItem = vi.fn().mockRejectedValue(new Error('not found'));
    const customersCreate = vi.fn().mockResolvedValue({ id: 'cust-new' });
    const customersGetOne = vi.fn().mockResolvedValue({ total_visits: 0, total_spent: 0 });
    const customersUpdate = vi.fn().mockResolvedValue({});

    const mockPb = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem,
      customersCreate,
      customersGetOne,
      customersUpdate,
    });

    vi.mocked(getPb).mockResolvedValue(mockPb as never);

    await saveAppointment({ ...BASE_PAYLOAD, customerEmail: injectionEmail });

    // pb.filter must have been called (parameterized path taken)
    expect(mockPb.filter).toHaveBeenCalledOnce();
    const [template, params] = mockPb.filter.mock.calls[0] as [string, Record<string, string>];

    // Template must use named placeholders — never raw interpolation
    expect(template).toContain('{:tenantId}');
    expect(template).toContain('{:email}');

    // The raw injection string must be confined to the params object, not baked into the template
    expect(template).not.toContain(injectionEmail);
    expect(params['email']).toBe(injectionEmail.toLowerCase().trim());
    expect(params['tenantId']).toBe(BASE_PAYLOAD.tenantId);
  });

  it('does NOT throw when aggregate update fails after appointment commits', async () => {
    const appointmentsCreate = vi.fn().mockResolvedValue({ id: 'appt-ok' });
    const customersGetOne = vi.fn().mockRejectedValue(new Error('aggregate fetch error'));
    const customersUpdate = vi.fn();

    const mockPb = makeMockPb({
      configGetFirstListItem: makeConfigGetFirstListItem(),
      customersGetFirstListItem: vi.fn().mockResolvedValue({ id: 'cust-1' }),
      customersGetOne,
      customersUpdate,
      appointmentsCreate,
    });

    vi.mocked(getPb).mockResolvedValue(mockPb as never);

    // Must resolve without throwing even though aggregate update fails
    await expect(saveAppointment(BASE_PAYLOAD)).resolves.not.toThrow();
    expect(appointmentsCreate).toHaveBeenCalledOnce();
    expect(customersUpdate).not.toHaveBeenCalled();
  });
});
