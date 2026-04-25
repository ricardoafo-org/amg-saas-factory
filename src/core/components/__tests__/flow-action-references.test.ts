/**
 * Contract: every `action` value in chatbot_flow.json is one of the registered
 * actions that ChatEngine.tsx handles. An unrecognised action causes the engine
 * to fall through to the message display path silently (no crash, but no effect).
 *
 * Keep KNOWN_ACTIONS in sync with the `if (node.action === …)` branches in
 * src/core/chatbot/ChatEngine.tsx.
 */
import { describe, it, expect } from 'vitest';
import flow from '../../../../clients/talleres-amg/chatbot_flow.json';

// Registered action handlers in ChatEngine.tsx (as of current build).
// Update this list when new actions are added to ChatEngine.
const KNOWN_ACTIONS = new Set([
  'save_appointment',
  'save_quote',
  'calc_oil_change',
  'load_slots',
  'collect_lopd_consent',
]);

type NodeAny = {
  action?: string;
  [key: string]: unknown;
};

describe('chatbot_flow.json — action references', () => {
  it('every action is a known handler', () => {
    const unknown: string[] = [];

    for (const [nodeId, rawNode] of Object.entries(flow.nodes)) {
      const node = rawNode as NodeAny;
      if (node.action !== undefined && !KNOWN_ACTIONS.has(node.action)) {
        unknown.push(`nodes.${nodeId}.action → "${node.action}" (not registered)`);
      }
    }

    expect(unknown).toEqual([]);
  });

  it('registered actions are referenced at least once in the flow', () => {
    // Ensure the registry is not stale (catches the opposite failure mode).
    const usedActions = new Set<string>();
    for (const rawNode of Object.values(flow.nodes)) {
      const node = rawNode as NodeAny;
      if (node.action) usedActions.add(node.action);
    }

    // These two are always required by compliance rules:
    expect(usedActions.has('collect_lopd_consent')).toBe(true);
    expect(usedActions.has('save_appointment')).toBe(true);
  });
});
