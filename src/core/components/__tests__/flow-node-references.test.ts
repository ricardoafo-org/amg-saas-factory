/**
 * Contract: every `next` value referenced in chatbot_flow.json points to a node
 * that actually exists in the `nodes` map.
 *
 * If this test fails, a user navigating the chatbot will hit a dead end (the engine
 * calls setDone(true) silently instead of throwing). BUG-007 was caught by manual
 * testing; this test makes it a regression-class failure.
 */
import { describe, it, expect } from 'vitest';
import flow from '../../../../clients/talleres-amg/chatbot_flow.json';

type NodeAny = {
  next?: string;
  options?: Array<{ next?: string; label?: string }>;
  params?: Record<string, string>;
  [key: string]: unknown;
};

describe('chatbot_flow.json — node reference integrity', () => {
  const nodeIds = new Set(Object.keys(flow.nodes));

  it('start node exists', () => {
    expect(nodeIds.has(flow.start)).toBe(true);
  });

  it('every `next` field points to an existing node', () => {
    const broken: string[] = [];

    for (const [nodeId, rawNode] of Object.entries(flow.nodes)) {
      const node = rawNode as NodeAny;

      if (node.next !== undefined && !nodeIds.has(node.next)) {
        broken.push(`nodes.${nodeId}.next → "${node.next}" (not found)`);
      }

      if (Array.isArray(node.options)) {
        for (const opt of node.options) {
          if (opt.next !== undefined && !nodeIds.has(opt.next)) {
            broken.push(
              `nodes.${nodeId}.options[label="${opt.label}"].next → "${opt.next}" (not found)`,
            );
          }
        }
      }
    }

    expect(broken).toEqual([]);
  });
});
