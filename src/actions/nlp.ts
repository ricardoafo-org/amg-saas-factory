'use server';

import Anthropic from '@anthropic-ai/sdk';

type Option = { label: string; next: string; value?: string };
type NlpResult = { index: number; confidence: number } | null;

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// Stable system prompt — marked for prompt caching (10x cost reduction on cached tokens)
const SYSTEM_PROMPT =
  'You are a routing assistant for a Spanish automotive workshop chatbot (Talleres AMG, Cartagena). ' +
  'Services offered: oil change, pre-ITV inspection, general mechanics, tyre change, brake service, ' +
  'electronic diagnostics, OBD scan, and quote requests. ' +
  'Reply with ONLY a single digit — the index of the best matching option. ' +
  'If no option fits, reply with -1.';

export async function resolveWithClaude(
  userMessage: string,
  options: Option[],
  nodeContext: string,
): Promise<NlpResult> {
  const ai = getClient();
  if (!ai) return null;

  const optionList = options.map((o, i) => `${i}: ${o.label}`).join('\n');

  try {
    const response = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Current step: ${nodeContext}\nUser said: "${userMessage}"\nOptions:\n${optionList}\n\nBest option index:`,
        },
      ],
    });

    const text = (response.content[0] as { type: string; text: string }).text.trim();
    const index = parseInt(text, 10);

    if (isNaN(index) || index < 0 || index >= options.length) return null;
    return { index, confidence: 0.9 };
  } catch {
    // Rate limited, no key, network error — degrade silently
    return null;
  }
}
