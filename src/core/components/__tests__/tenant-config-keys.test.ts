/**
 * Contract: every `{{config.X}}` token in chatbot_flow.json has a corresponding
 * config key that is known to exist (either in migrations or in the seed data).
 *
 * The set of KNOWN_CONFIG_KEYS is derived from:
 *   - pb_migrations/1776471121_add_collection_fields.js (iva_rate field)
 *   - pb_migrations/1776471114_created_config.js (collection schema)
 *   - clients/talleres-amg/config.json (ivaRate, businessName, etc.)
 *   - The resolveFlowTokens() usage in src/actions/chatbot.ts which reads
 *     "iva_rate" and "business_name" from PocketBase config.
 *
 * If a token is added to the flow but no migration seeds its key, the runtime
 * resolveFlowTokens() will return the literal {{config.X}} string to the user.
 */
import { describe, it, expect } from 'vitest';
import flow from '../../../../clients/talleres-amg/chatbot_flow.json';

// Keys known to be seeded / migrated in this project.
// Update when new config keys are added via migrations.
const KNOWN_CONFIG_KEYS = new Set([
  'iva_rate',
  'business_name',
]);

type NodeAny = {
  message?: string;
  options?: Array<{ label?: string }>;
  params?: Record<string, string>;
  [key: string]: unknown;
};

function extractConfigTokens(str: string): string[] {
  const matches = [...str.matchAll(/\{\{config\.(\w+)\}\}/g)];
  return matches.map((m) => m[1] as string);
}

describe('chatbot_flow.json — config token coverage', () => {
  it('every {{config.X}} token has a known config key', () => {
    const unknown: string[] = [];

    for (const [nodeId, rawNode] of Object.entries(flow.nodes)) {
      const node = rawNode as NodeAny;

      // Check message strings
      if (node.message) {
        for (const token of extractConfigTokens(node.message)) {
          if (!KNOWN_CONFIG_KEYS.has(token)) {
            unknown.push(`nodes.${nodeId}.message uses {{config.${token}}} (no migration found)`);
          }
        }
      }

      // Check option labels
      if (Array.isArray(node.options)) {
        for (const opt of node.options) {
          if (opt.label) {
            for (const token of extractConfigTokens(opt.label)) {
              if (!KNOWN_CONFIG_KEYS.has(token)) {
                unknown.push(
                  `nodes.${nodeId}.options[label="${opt.label}"] uses {{config.${token}}} (no migration found)`,
                );
              }
            }
          }
        }
      }

      // Check params values
      if (node.params) {
        for (const [paramKey, paramVal] of Object.entries(node.params)) {
          for (const token of extractConfigTokens(paramVal)) {
            if (!KNOWN_CONFIG_KEYS.has(token)) {
              unknown.push(
                `nodes.${nodeId}.params.${paramKey} uses {{config.${token}}} (no migration found)`,
              );
            }
          }
        }
      }
    }

    expect(unknown).toEqual([]);
  });

  it('current flow JSON has no unresolved config tokens (zero drift baseline)', () => {
    // This test serves as a snapshot: if ALL tokens in the flow are already known,
    // the count of unknown tokens must be zero. Helps catch copy-paste from examples.
    const allTokens: string[] = [];

    for (const rawNode of Object.values(flow.nodes)) {
      const node = rawNode as NodeAny;
      if (node.message) allTokens.push(...extractConfigTokens(node.message));
    }

    const unknownTokens = allTokens.filter((t) => !KNOWN_CONFIG_KEYS.has(t));
    expect(unknownTokens).toHaveLength(0);
  });
});
