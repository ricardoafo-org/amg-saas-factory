import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * BUG-012 — Chatbot dead-ends after fuel-type step when load_slots / oil_calc
 * actions hand off to the next node. Root cause: `setCurrentNodeId(node.next)`
 * only updates state — it does NOT render the next node's message or trigger
 * its `collect` input. The user saw the "no slots, call phone" fallback and
 * a frozen UI.
 *
 * Fix: use `goToNode(node.next, vars)` so the next node's render path
 * (message + input + options) executes.
 *
 * This is a source-level contract test: it pins the post-action transition
 * helper so a future refactor cannot silently regress to setCurrentNodeId.
 */

const SOURCE = readFileSync(
  join(process.cwd(), 'src', 'core', 'chatbot', 'ChatEngine.tsx'),
  'utf8',
);

describe('BUG-012 — post-action transitions use goToNode, not setCurrentNodeId', () => {
  it('calc_oil_change empty-slots path advances via goToNode', () => {
    // The catch handler must use goToNode so the user lands on a renderable node.
    expect(SOURCE).toMatch(/\.catch\(\(\) => \{\s*setLoadingSlots\(false\);\s*if \(node\.next\) goToNode\(node\.next, newVars\);/);
  });

  it('load_slots empty-slots path advances via goToNode after the phone fallback', () => {
    // The else branch (no slots) must use goToNode so the next collect/message renders.
    expect(SOURCE).toMatch(/No hay huecos disponibles[^]*?if \(node\.next\) goToNode\(node\.next, vars\);/);
  });

  it('load_slots offline-no-cache path advances via goToNode', () => {
    expect(SOURCE).toMatch(/Sin conexión[^]*?if \(node\.next\) goToNode\(node\.next, vars\);/);
  });

  it('does NOT use setCurrentNodeId(node.next) for failure / empty-slot fallbacks', () => {
    // Strip line comments before counting so the historical reference in the
    // bugfix comment block does not register.
    const stripped = SOURCE.replace(/\/\/[^\n]*/g, '');
    const matches = stripped.match(/setCurrentNodeId\(node\.next\)/g) ?? [];
    // Only one legitimate occurrence remains: the calc_oil_change success
    // branch pre-positions currentNodeId for handleSlotSelect's currentNode?.next read.
    expect(matches.length).toBeLessThanOrEqual(1);
  });
});
