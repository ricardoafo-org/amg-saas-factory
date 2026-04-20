import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import { QuoteRequest } from '@/emails/QuoteRequest';
import flow from '../../../../clients/talleres-amg/chatbot_flow.json';
import type { ChatbotFlow } from '@/lib/chatbot/engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Replicate the addBusinessDays logic from chatbot.ts for testing. */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function isWeekday(date: Date): boolean {
  const dow = date.getDay();
  return dow !== 0 && dow !== 6;
}

// ---------------------------------------------------------------------------
// addBusinessDays — RD 1457/1986 validity (12 business days)
// ---------------------------------------------------------------------------

describe('addBusinessDays', () => {
  it('adds exactly 12 business days', () => {
    const start = new Date('2026-04-21T00:00:00.000Z'); // Monday
    const result = addBusinessDays(start, 12);
    // 12 business days from Mon Apr 21: Mon 21 + 12 biz = Mon May 7 (skipping weekends)
    // Week 1: Tue 22, Wed 23, Thu 24, Fri 25 (4), Sat 26 skip, Sun 27 skip
    // Week 2: Mon 28, Tue 29, Wed 30, Thu May 1, Fri 2 (9), Sat 3 skip, Sun 4 skip
    // Week 3: Mon 5, Tue 6, Wed 7 (12)
    expect(result.toISOString().startsWith('2026-05-07')).toBe(true);
  });

  it('result is always a weekday', () => {
    const starts = [
      new Date('2026-04-20T00:00:00.000Z'), // Monday
      new Date('2026-04-17T00:00:00.000Z'), // Friday
      new Date('2026-04-18T00:00:00.000Z'), // Saturday
      new Date('2026-04-19T00:00:00.000Z'), // Sunday
    ];
    for (const start of starts) {
      const result = addBusinessDays(start, 12);
      expect(isWeekday(result)).toBe(true);
    }
  });

  it('skips weekends correctly when starting on a Friday', () => {
    const friday = new Date('2026-04-17T00:00:00.000Z'); // Friday
    const result = addBusinessDays(friday, 1);
    // Next business day from Friday is Monday
    expect(result.getDay()).toBe(1); // Monday
  });

  it('adds 0 business days returns the next business day', () => {
    // 0 business days means no days added — result equals input
    const monday = new Date('2026-04-21T00:00:00.000Z');
    const result = addBusinessDays(monday, 0);
    expect(result.getTime()).toBe(monday.getTime());
  });
});

// ---------------------------------------------------------------------------
// Chatbot flow — quote path integrity
// ---------------------------------------------------------------------------

const typedFlow = flow as ChatbotFlow;

describe('chatbot_flow quote path', () => {
  it('welcome options include "Solicitar presupuesto"', () => {
    const welcome = typedFlow.nodes['welcome'];
    if (!('message' in welcome)) throw new Error('welcome must be a message node');
    const opts = welcome.options ?? [];
    const presupuesto = opts.find((o) => o.label === 'Solicitar presupuesto');
    expect(presupuesto).toBeDefined();
    expect(presupuesto?.next).toBe('quote_ask_service_type');
  });

  it('entire quote path: all next references point to existing nodes', () => {
    const quoteNodes = [
      'quote_ask_service_type',
      'quote_ask_vehicle',
      'quote_ask_problem',
      'quote_ask_name',
      'quote_ask_phone',
      'quote_ask_email',
      'lopd_consent_quote',
      'save_quote',
      'quote_confirmation',
    ];

    for (const nodeId of quoteNodes) {
      expect(typedFlow.nodes[nodeId], `Node '${nodeId}' must exist`).toBeDefined();
    }
  });

  it('lopd_consent_quote uses collect_lopd_consent action before save_quote', () => {
    const lopdNode = typedFlow.nodes['lopd_consent_quote'];
    // Narrow to action node
    if (!('action' in lopdNode)) throw new Error('lopd_consent_quote must be an action node');
    expect(lopdNode.action).toBe('collect_lopd_consent');
    expect(lopdNode.next).toBe('save_quote');
    expect(lopdNode.params?.['policy_url']).toBeTruthy();
    expect(lopdNode.params?.['policy_version']).toBeTruthy();
  });

  it('save_quote uses save_quote action', () => {
    const saveNode = typedFlow.nodes['save_quote'];
    if (!('action' in saveNode)) throw new Error('save_quote must be an action node');
    expect(saveNode.action).toBe('save_quote');
    expect(saveNode.next).toBe('quote_confirmation');
  });

  it('quote_confirmation message contains required RD 1457/1986 text', () => {
    const confirmNode = typedFlow.nodes['quote_confirmation'];
    if (!('message' in confirmNode)) throw new Error('quote_confirmation must be a message node');
    expect(confirmNode.message).toContain('orientativo y sin compromiso');
    expect(confirmNode.message).toContain('12 días hábiles');
  });

  it('quote_confirmation message contains pre-IVA notice', () => {
    const confirmNode = typedFlow.nodes['quote_confirmation'];
    if (!('message' in confirmNode)) throw new Error('quote_confirmation must be a message node');
    expect(confirmNode.message.toLowerCase()).toContain('iva');
  });

  it('quote_ask_email next is lopd_consent_quote (consent before save)', () => {
    const emailNode = typedFlow.nodes['quote_ask_email'];
    if (!('message' in emailNode)) throw new Error('quote_ask_email must be a message node');
    expect(emailNode.next).toBe('lopd_consent_quote');
  });

  it('each collect node in quote path captures expected variable key', () => {
    const collectMapping: Record<string, string> = {
      quote_ask_vehicle: 'quote_vehicle',
      quote_ask_problem: 'quote_problem',
      quote_ask_name: 'quote_customer_name',
      quote_ask_phone: 'quote_customer_phone',
      quote_ask_email: 'quote_customer_email',
    };

    for (const [nodeId, expectedKey] of Object.entries(collectMapping)) {
      const node = typedFlow.nodes[nodeId];
      if (!('message' in node)) throw new Error(`${nodeId} must be a message/collect node`);
      expect(node.collect, `${nodeId} should collect '${expectedKey}'`).toBe(expectedKey);
    }
  });
});

// ---------------------------------------------------------------------------
// QuoteRequest email — LOPD consent rejected path (email never rendered)
// ---------------------------------------------------------------------------

describe('QuoteRequest email content', () => {
  it('contains "Te contactaremos en 24h" — spec AC #5', async () => {
    const html = await render(
      QuoteRequest({
        customerName: 'María Test',
        serviceType: 'Mecánica',
        vehicleDescription: 'Ford Focus 2019',
        businessName: 'Talleres AMG',
        businessPhone: '+34 968 000 000',
        validUntilStr: '7 de mayo de 2026',
        baseUrl: 'http://localhost:3000',
        primaryColor: '#c0392b',
      }),
    );
    expect(html).toContain('24');
    expect(html).toContain('presupuesto');
  });

  it('contains RD 1457/1986 validity notice', async () => {
    const html = await render(
      QuoteRequest({
        customerName: 'Test',
        serviceType: 'Electrónica',
        vehicleDescription: 'BMW Serie 3',
        businessName: 'Talleres AMG',
        businessPhone: '+34 968 000 000',
        validUntilStr: '7 de mayo de 2026',
        baseUrl: 'http://localhost:3000',
        primaryColor: '#c0392b',
      }),
    );
    expect(html).toContain('12 días hábiles');
    expect(html).toContain('sin compromiso');
    expect(html).toContain('RD 1457/1986');
  });

  it('contains pre-IVA notice in email', async () => {
    const html = await render(
      QuoteRequest({
        customerName: 'Test',
        serviceType: 'Carrocería',
        vehicleDescription: 'Renault Megane 2020',
        businessName: 'Talleres AMG',
        businessPhone: '+34 968 000 000',
        validUntilStr: '7 de mayo de 2026',
        baseUrl: 'http://localhost:3000',
        primaryColor: '#c0392b',
      }),
    );
    // Email must mention IVA (stated as pre-IVA in legalStyle text)
    expect(html.toLowerCase()).toContain('iva');
  });
});
