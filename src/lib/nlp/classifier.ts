export type Intent =
  | 'book_appointment'
  | 'oil_change'
  | 'query_itv'
  | 'query_price'
  | 'query_hours'
  | 'query_location'
  | 'greeting'
  | 'help'
  | 'yes'
  | 'no'
  | 'unknown';

export type ClassifyResult = {
  intent: Intent;
  confidence: number;
  raw: string;
};

type FlowOption = { label: string; next: string; value?: string };
export type MatchResult = { option: FlowOption; confidence: number } | null;

// Normalize: lowercase + strip accents + strip punctuation
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PATTERNS: Array<{ intent: Intent; patterns: RegExp[]; confidence: number }> = [
  {
    intent: 'book_appointment',
    confidence: 0.88,
    patterns: [
      /\bcita\b/,
      /\breserv(ar|a)\b/,
      /\bpedir\s+hora\b/,
      /\bturno\b/,
      /\bagendar\b/,
    ],
  },
  {
    intent: 'oil_change',
    confidence: 0.9,
    patterns: [
      /\bac[ei]te\b/,
      /\bcambio\s+(de\s+)?aceite\b/,
      /\bcambio\b/,
      /\blubric/,
    ],
  },
  {
    intent: 'query_itv',
    confidence: 0.9,
    patterns: [
      /\bitv\b/,
      /\binspeccion\s+tecnica\b/,
      /\bpre.?itv\b/,
    ],
  },
  {
    intent: 'query_price',
    confidence: 0.85,
    patterns: [
      /\bprecio/,
      /\bcoste\b/,
      /\bcosto\b/,
      /cuanto\s+(cuesta|vale|cobr)/,
      /\btarifa/,
      /\bpresupuest/,
    ],
  },
  {
    intent: 'query_hours',
    confidence: 0.85,
    patterns: [
      /\bhorario/,
      /\bhoras?\s+de\s+(apertura|trabajo)\b/,
      /\babierto\b/,
      /\bcierre\b/,
      /cuando\s+abr/,
    ],
  },
  {
    intent: 'query_location',
    confidence: 0.85,
    patterns: [
      /\bdonde\b/,
      /\bdireccion\b/,
      /donde\s+(esta|queda)\b/,
      /como\s+llegar\b/,
      /\blocaliz/,
      /\bubic/,
    ],
  },
  {
    intent: 'help',
    confidence: 0.9,
    patterns: [
      /\bayuda\b/,
      /\bopcion(es)?\b/,
      /\bmenu\b/,
      /que\s+(puedo|pued[eo]s)\s+(hacer|pedirte|preguntarte)/,
      /que\s+(ofrece[ns]?|hace[ns]?|tienen?|tien[ei]s)\b/,
      /\bque\s+servicio/,
      /para\s+que\s+(sirves?|vales?)\b/,
    ],
  },
  {
    intent: 'greeting',
    confidence: 0.8,
    patterns: [/^(hola|buenas|buenos|saludos|hey)\b/],
  },
  {
    intent: 'yes',
    confidence: 0.85,
    patterns: [/^(si|yes|claro|por\s+supuesto|vale|ok|perfecto|adelante|correcto|exacto)\b/],
  },
  {
    intent: 'no',
    confidence: 0.85,
    patterns: [/^(no|nope|para\s+nada|en\s+absoluto|tampoco)\b/],
  },
];

const INTENT_LABEL_KEYWORDS: Record<string, string[]> = {
  oil_change: ['aceite', 'cambio'],
  query_itv: ['itv', 'pre-itv', 'revision'],
  book_appointment: ['cita', 'mecanica', 'reservar', 'general'],
  query_price: ['precio', 'tarifa', 'coste'],
  yes: ['si', 'correcto', 'claro'],
  no: ['no', 'otro', 'cancelar', 'ninguno'],
  query_location: ['ubicacion', 'direccion', 'llegar'],
  query_hours: ['horario', 'abierto'],
};

export function classifyIntent(text: string): ClassifyResult {
  const norm = normalize(text);
  for (const { intent, patterns, confidence } of PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(norm)) {
        return { intent, confidence, raw: text };
      }
    }
  }
  return { intent: 'unknown', confidence: 0, raw: text };
}

export function matchOptionByNlp(text: string, options: FlowOption[]): MatchResult {
  const norm = normalize(text);

  // Direct substring match (normalized)
  for (const opt of options) {
    const labelNorm = normalize(opt.label);
    if (labelNorm.includes(norm) || norm.includes(labelNorm)) {
      return { option: opt, confidence: 0.95 };
    }
    // Any significant word (>3 chars) from the label found in input
    const significantWords = labelNorm.split(/\s+/).filter((w) => w.length > 3);
    if (significantWords.some((w) => norm.includes(w))) {
      return { option: opt, confidence: 0.85 };
    }
  }

  // Intent-based matching
  const { intent, confidence } = classifyIntent(text);
  if (confidence < 0.8 || intent === 'unknown') return null;

  const keywords = INTENT_LABEL_KEYWORDS[intent] ?? [];
  for (const opt of options) {
    const labelNorm = normalize(opt.label);
    if (keywords.some((k) => labelNorm.includes(k))) {
      return { option: opt, confidence };
    }
  }

  return null;
}
