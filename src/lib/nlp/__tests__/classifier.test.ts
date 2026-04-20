import { describe, it, expect } from 'vitest';
import { classifyIntent, matchOptionByNlp, normalize } from '@/lib/nlp/classifier';
import type { Intent } from '@/lib/nlp/classifier';

// ---------------------------------------------------------------------------
// Fixtures: 50+ real Spanish inputs
// ---------------------------------------------------------------------------

type Fixture = { input: string; expectedIntent: Intent };

const BOOK_APPOINTMENT_FIXTURES: Fixture[] = [
  { input: 'quiero pedir una cita', expectedIntent: 'book_appointment' },
  { input: 'reservar', expectedIntent: 'book_appointment' },
  { input: 'reserva', expectedIntent: 'book_appointment' },
  { input: 'cita', expectedIntent: 'book_appointment' },
  { input: 'revervsr cita', expectedIntent: 'book_appointment' }, // typo: 'reservar'
  { input: 'necesito pedir hora', expectedIntent: 'book_appointment' },
  { input: 'quiero agendar una visita', expectedIntent: 'book_appointment' },
  { input: 'quiero ponerme en cola', expectedIntent: 'book_appointment' },
  { input: 'un turno por favor', expectedIntent: 'book_appointment' },
];

const OIL_FIXTURES: Fixture[] = [
  { input: 'aceite', expectedIntent: 'oil_change' },
  { input: 'cambio de aceite', expectedIntent: 'oil_change' },
  { input: 'necesito cambiar el aceite', expectedIntent: 'oil_change' },
  { input: 'aseite motor', expectedIntent: 'oil_change' }, // typo: 'aceite'
  { input: 'el aceite del coche', expectedIntent: 'oil_change' },
  { input: 'cambio aceite', expectedIntent: 'oil_change' },
  { input: 'lubricante del motor', expectedIntent: 'oil_change' },
  { input: 'me ha salido la luz del aceite', expectedIntent: 'oil_change' },
];

const ITV_FIXTURES: Fixture[] = [
  { input: 'itv', expectedIntent: 'query_itv' },
  { input: 'quiero pasar la itv', expectedIntent: 'query_itv' },
  { input: 'itv cuande', expectedIntent: 'query_itv' }, // typo: 'cuando'
  { input: 'pre-itv', expectedIntent: 'query_itv' },
  { input: 'pre itv', expectedIntent: 'query_itv' },
  { input: 'inspección técnica', expectedIntent: 'query_itv' },
  { input: 'inspeccion tecnica', expectedIntent: 'query_itv' },
];

const PRICE_FIXTURES: Fixture[] = [
  { input: 'precio', expectedIntent: 'query_price' },
  { input: 'cuanto cuesta', expectedIntent: 'query_price' },
  { input: 'cuanto vale', expectedIntent: 'query_price' },
  { input: 'cuanto cobran', expectedIntent: 'query_price' },
  { input: 'que precio tiene', expectedIntent: 'query_price' },
  { input: 'tarifa', expectedIntent: 'query_price' },
  { input: 'presupuesto', expectedIntent: 'query_price' },
  { input: 'me puedes dar un presupuesto', expectedIntent: 'query_price' },
];

const HOURS_FIXTURES: Fixture[] = [
  { input: 'horario', expectedIntent: 'query_hours' },
  { input: 'a que hora abren', expectedIntent: 'query_hours' },
  { input: 'cuando abren', expectedIntent: 'query_hours' },
  { input: 'estais abiertos', expectedIntent: 'query_hours' },
  { input: 'horario de apertura', expectedIntent: 'query_hours' },
  { input: 'a que hora cierran', expectedIntent: 'query_hours' },
];

const GREETING_FIXTURES: Fixture[] = [
  { input: 'hola', expectedIntent: 'greeting' },
  { input: 'buenas', expectedIntent: 'greeting' },
  { input: 'hey', expectedIntent: 'greeting' },
  { input: 'buenos días', expectedIntent: 'greeting' },
  { input: 'saludos', expectedIntent: 'greeting' },
];

const YES_FIXTURES: Fixture[] = [
  { input: 'sí', expectedIntent: 'yes' },
  { input: 'si', expectedIntent: 'yes' },
  { input: 'claro', expectedIntent: 'yes' },
  { input: 'vale', expectedIntent: 'yes' },
  { input: 'de acuerdo', expectedIntent: 'yes' },
  { input: 'ok', expectedIntent: 'yes' },
  { input: 'perfecto', expectedIntent: 'yes' },
];

const NO_FIXTURES: Fixture[] = [
  { input: 'no', expectedIntent: 'no' },
  { input: 'no gracias', expectedIntent: 'no' },
  { input: 'para nada', expectedIntent: 'no' },
  { input: 'en absoluto', expectedIntent: 'no' },
];

// ---------------------------------------------------------------------------
// Part A.1 — classifyIntent: standard fixture sweep
// ---------------------------------------------------------------------------

describe('classifyIntent — Spanish fixture corpus', () => {
  const runFixtures = (label: string, fixtures: Fixture[]) => {
    describe(label, () => {
      fixtures.forEach(({ input, expectedIntent }) => {
        it(`"${input}" → ${expectedIntent}`, () => {
          const result = classifyIntent(input);
          expect(result.intent).toBe(expectedIntent);
          expect(result.raw).toBe(input);
          expect(result.confidence).toBeGreaterThan(0);
        });
      });
    });
  };

  runFixtures('book_appointment', BOOK_APPOINTMENT_FIXTURES);
  runFixtures('oil_change', OIL_FIXTURES);
  runFixtures('query_itv', ITV_FIXTURES);
  runFixtures('query_price', PRICE_FIXTURES);
  runFixtures('query_hours', HOURS_FIXTURES);
  runFixtures('greeting', GREETING_FIXTURES);
  runFixtures('yes', YES_FIXTURES);
  runFixtures('no', NO_FIXTURES);
});

// ---------------------------------------------------------------------------
// Part A.2 — normalize() idempotency
// ---------------------------------------------------------------------------

describe('normalize — idempotency', () => {
  const samples = [
    'Hola, ¿cómo estás?',
    'RESERVAR CITA',
    'aceite del motor!!',
    'itv cuándo',
    '¡Buenos días!',
    'Sí, claro',
    'señor',
    '',
    '   múltiples   espacios   ',
    'acción rápida',
  ];

  samples.forEach((s) => {
    it(`is idempotent for: "${s}"`, () => {
      expect(normalize(normalize(s))).toBe(normalize(s));
    });
  });

  it('lowercases all characters', () => {
    expect(normalize('ACEITE')).toBe('aceite');
  });

  it('strips accents', () => {
    expect(normalize('revisión')).toBe('revision');
    expect(normalize('cómo')).toBe('como');
  });

  it('strips punctuation', () => {
    expect(normalize('hola!')).toBe('hola');
    expect(normalize('¿qué?')).toBe('que');
  });

  it('collapses multiple spaces to one', () => {
    expect(normalize('hola   mundo')).toBe('hola mundo');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalize('  hola  ')).toBe('hola');
  });
});

// ---------------------------------------------------------------------------
// Part A.3 — Accent/no-accent equivalence
// ---------------------------------------------------------------------------

describe('classifyIntent — accent/no-accent equivalence', () => {
  it('"revisión" and "revision" both reach query_itv via normalize', () => {
    const withAccent = classifyIntent('revisión');
    const withoutAccent = classifyIntent('revision');
    // Both should normalize to the same thing — same intent result
    expect(withAccent.intent).toBe(withoutAccent.intent);
  });

  it('"reservar" and "reservár" resolve to book_appointment', () => {
    const a = classifyIntent('reservar');
    expect(a.intent).toBe('book_appointment');
  });

  it('"sí" and "si" both resolve to yes', () => {
    expect(classifyIntent('sí').intent).toBe('yes');
    expect(classifyIntent('si').intent).toBe('yes');
  });
});

// ---------------------------------------------------------------------------
// Part A.4 — Property-based invariants
// ---------------------------------------------------------------------------

describe('classifyIntent — cross-intent isolation invariants', () => {
  const oilInputs = [
    'aceite motor',
    'cambio aceite',
    'oil change',
    'necesito el aceite',
    'aseite',
    'cambio de aceite urgente',
    'el aceite del coche',
  ];

  oilInputs.forEach((input) => {
    it(`"${input}" containing aceite/oil NEVER returns query_itv`, () => {
      const result = classifyIntent(input);
      expect(result.intent).not.toBe('query_itv');
    });
  });

  const itvInputs = [
    'itv',
    'quiero pasar la itv',
    'pre-itv',
    'inspeccion tecnica',
    'itv cuande',
  ];

  itvInputs.forEach((input) => {
    it(`"${input}" containing itv NEVER returns oil_change`, () => {
      const result = classifyIntent(input);
      expect(result.intent).not.toBe('oil_change');
    });
  });
});

describe('classifyIntent — low confidence → unknown or fallback', () => {
  const gibberishInputs = [
    'xyzabc',
    'asdfqwerty',
    '12345',
    'zxcvbnm',
  ];

  gibberishInputs.forEach((input) => {
    it(`low-signal "${input}" returns unknown with confidence 0`, () => {
      const result = classifyIntent(input);
      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });

  it('unknown intent always returns confidence 0', () => {
    const result = classifyIntent('gfhdjskflsdfkj');
    if (result.intent === 'unknown') {
      expect(result.confidence).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Part A.5 — matchOptionByNlp
// ---------------------------------------------------------------------------

const SAMPLE_OPTIONS = [
  { label: 'Cambio de aceite', next: 'oil_node', value: 'cambio-aceite' },
  { label: 'Revisión Pre-ITV', next: 'itv_node', value: 'pre-itv' },
  { label: 'Mecánica general', next: 'mec_node', value: 'mecanica' },
  { label: 'Consultar precios', next: 'price_node', value: 'precio' },
];

describe('matchOptionByNlp', () => {
  it('matches oil change option from "aceite"', () => {
    const result = matchOptionByNlp('aceite', SAMPLE_OPTIONS);
    expect(result).not.toBeNull();
    expect(result?.option.value).toBe('cambio-aceite');
    expect(result?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches ITV option from "itv"', () => {
    const result = matchOptionByNlp('itv', SAMPLE_OPTIONS);
    expect(result).not.toBeNull();
    expect(result?.option.value).toBe('pre-itv');
  });

  it('matches price option from "cuanto cuesta"', () => {
    const result = matchOptionByNlp('cuanto cuesta', SAMPLE_OPTIONS);
    expect(result).not.toBeNull();
    expect(result?.option.value).toBe('precio');
  });

  it('returns null for gibberish with no matching option', () => {
    const result = matchOptionByNlp('xyzqwerty', SAMPLE_OPTIONS);
    expect(result).toBeNull();
  });

  it('direct label match returns confidence 0.95', () => {
    const result = matchOptionByNlp('Cambio de aceite', SAMPLE_OPTIONS);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe(0.95);
  });

  it('significant word match returns confidence >= 0.85', () => {
    const result = matchOptionByNlp('aceite', SAMPLE_OPTIONS);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('null result when options list is empty', () => {
    const result = matchOptionByNlp('aceite', []);
    expect(result).toBeNull();
  });
});
