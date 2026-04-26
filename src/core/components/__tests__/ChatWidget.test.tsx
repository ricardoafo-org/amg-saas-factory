import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * FEAT-038 PR 10 — ChatWidget shell INP contract.
 *
 * The shell renders the FAB and the open-chat event listeners only.
 * Every heavy dependency (framer-motion, ChatEngine, BookingStepper)
 * MUST live behind a dynamic import in ChatPanel.tsx so users who never
 * open the chat never pay for it.
 */

const SHELL = readFileSync(
  join(process.cwd(), 'src', 'core', 'components', 'ChatWidget.tsx'),
  'utf8',
);
const PANEL = readFileSync(
  join(process.cwd(), 'src', 'core', 'components', 'ChatPanel.tsx'),
  'utf8',
);

describe('ChatWidget shell — FEAT-038 PR 10 INP contract', () => {
  it('does not statically import framer-motion (deferred to ChatPanel)', () => {
    expect(SHELL).not.toMatch(/from ['"]framer-motion['"]/);
  });

  it('does not statically import ChatEngine (deferred to ChatPanel)', () => {
    expect(SHELL).not.toMatch(/from ['"]@\/core\/chatbot\/ChatEngine['"]/);
  });

  it('does not statically import BookingStepper (deferred to ChatPanel)', () => {
    expect(SHELL).not.toMatch(/import .*BookingStepper/);
    expect(SHELL).not.toMatch(/from ['"]@\/core\/chatbot\/components\/BookingStepper['"]/);
  });

  it('uses next/dynamic to load the panel', () => {
    expect(SHELL).toMatch(/from ['"]next\/dynamic['"]/);
    expect(SHELL).toMatch(/dynamic\(\(\) => import\(['"]\.\/ChatPanel['"]\)/);
  });

  it('disables SSR for the panel so server bundle stays slim', () => {
    expect(SHELL).toMatch(/ssr:\s*false/);
  });

  it('pre-warms the panel on hover, focus, and touch for snappy open', () => {
    expect(SHELL).toMatch(/onMouseEnter=\{prefetchPanel\}/);
    expect(SHELL).toMatch(/onFocus=\{prefetchPanel\}/);
    expect(SHELL).toMatch(/onTouchStart=\{prefetchPanel\}/);
  });

  it('still wires data-action="open-chat" delegation for Server Component CTAs', () => {
    expect(SHELL).toMatch(/data-action="open-chat"/);
  });

  it('still listens for the amg:open-chat CustomEvent from ServiceGrid', () => {
    expect(SHELL).toMatch(/'amg:open-chat'/);
  });
});

describe('ChatPanel — FEAT-038 PR 10 contract', () => {
  it('owns the framer-motion subtree so the shell stays slim', () => {
    expect(PANEL).toMatch(/from ['"]framer-motion['"]/);
  });

  it('owns the ChatEngine import', () => {
    expect(PANEL).toMatch(/from ['"]@\/core\/chatbot\/ChatEngine['"]/);
  });

  it('owns the BookingStepper import', () => {
    expect(PANEL).toMatch(/BookingStepper/);
  });

  it('exposes a default export so next/dynamic can resolve it', () => {
    expect(PANEL).toMatch(/export default function ChatPanel/);
  });

  it('keeps role="dialog" + aria-modal so the a11y contract is unchanged', () => {
    expect(PANEL).toMatch(/role="dialog"/);
    expect(PANEL).toMatch(/aria-modal="true"/);
  });
});
