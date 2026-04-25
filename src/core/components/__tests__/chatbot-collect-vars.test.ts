/**
 * Contract: every `collect` field name in chatbot_flow.json is actually read by
 * ChatEngine.tsx → saveAppointment or saveQuoteRequest.
 *
 * An uncollected variable means the booking/quote payload will contain an empty
 * string, which causes PocketBase validation failures or silent data loss.
 *
 * Variables consumed by ChatEngine in the handleSave / handleSaveQuote functions.
 * Update CONSUMED_VARS when the payload interface in src/actions/chatbot.ts changes.
 */
import { describe, it, expect } from 'vitest';
import flow from '../../../../clients/talleres-amg/chatbot_flow.json';

// All variable names that are READ from the `vars` bag in ChatEngine.tsx
// (inside handleSave, handleSaveQuote, and the oil calc branch).
// Derived from reading ChatEngine.tsx — keep in sync when payload keys change.
const CONSUMED_VARS = new Set([
  // Booking flow (handleSave → saveAppointment payload)
  'matricula',
  'fuel',
  'fecha_preferida',
  'selected_slot_date',
  'selected_slot_id',
  'service_ids',
  'service',
  'customer_name',
  'customer_phone',
  'customer_email',
  '_service_summary_next',
  // Quote flow (handleSaveQuote → saveQuoteRequest payload)
  'quote_customer_name',
  'quote_customer_phone',
  'quote_customer_email',
  'quote_vehicle',
  'quote_problem',
  'quote_service_type',
  'quote_service',
  // Oil calc (calc_oil_change branch)
  'oil_ask_fuel',
  'oil_km_last',
  'oil_km_now',
  'oil_result_message',
  'oil_km_left',
  // Slot booking
  'ask_fuel', // fuel option value written as vars['fuel'] via handleOptionSelect
]);

type NodeAny = {
  collect?: string;
  [key: string]: unknown;
};

describe('chatbot_flow.json — collect variable consumption', () => {
  it('every collect field is consumed somewhere in ChatEngine / actions', () => {
    const uncollected: string[] = [];

    for (const [nodeId, rawNode] of Object.entries(flow.nodes)) {
      const node = rawNode as NodeAny;
      if (node.collect !== undefined && !CONSUMED_VARS.has(node.collect)) {
        uncollected.push(`nodes.${nodeId}.collect = "${node.collect}" is not read by ChatEngine`);
      }
    }

    expect(uncollected).toEqual([]);
  });
});
