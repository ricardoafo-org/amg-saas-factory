import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * FEAT-038 PR 5 — Cross-document View Transitions.
 *
 * Pins the @view-transition opt-in and the named transition targets
 * (hero, nav-cta, pcb-hero) so a stylistic refactor can't silently
 * disable cross-document morphs.
 */

const CSS = readFileSync(
  join(process.cwd(), 'src', 'app', 'globals.css'),
  'utf8',
);

describe('globals.css — FEAT-038 PR 5 view transitions contract', () => {
  it('opts every same-origin navigation into View Transitions', () => {
    expect(CSS).toMatch(/@view-transition\s*\{\s*navigation:\s*auto/);
  });

  it('scopes the root transition timing to the mech-easing curve', () => {
    expect(CSS).toMatch(/::view-transition-old\(root\),?\s*::view-transition-new\(root\)/);
    expect(CSS).toMatch(/animation-timing-function:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
  });

  it('honours prefers-reduced-motion by collapsing to 0.01ms', () => {
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*::view-transition/);
  });

  it('names .hero as a transition target', () => {
    expect(CSS).toMatch(/\.hero\s*\{[^}]*view-transition-name:\s*hero/);
  });

  it('names the navbar CTA as nav-cta', () => {
    expect(CSS).toMatch(/\.nav\s+\.open-chat-trigger\s*\{\s*view-transition-name:\s*nav-cta/);
  });

  it('names .pcb-hero as a transition target', () => {
    expect(CSS).toMatch(/\.pcb-hero[^{]*\{[^}]*view-transition-name:\s*pcb-hero/);
  });
});
