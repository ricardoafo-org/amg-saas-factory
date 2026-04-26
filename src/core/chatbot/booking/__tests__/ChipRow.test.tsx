/**
 * ChipRow — selection behaviour and rendering tests.
 * Uses renderToStaticMarkup for HTML contract tests.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChipRow } from '@/core/chatbot/booking/ChipRow';

const OPTIONS = [
  { value: 'a', label: 'Opción A' },
  { value: 'b', label: 'Opción B' },
  { value: 'c', label: 'Opción C' },
];

describe('ChipRow — rendering', () => {
  it('renders all options as buttons', () => {
    const html = renderToStaticMarkup(
      <ChipRow options={OPTIONS} onSelect={vi.fn()} />,
    );
    expect(html).toContain('Opción A');
    expect(html).toContain('Opción B');
    expect(html).toContain('Opción C');
    // Each option renders as a button element
    const btnCount = (html.match(/<button/g) ?? []).length;
    expect(btnCount).toBe(3);
  });

  it('selected option has bg-primary class', () => {
    const opts = [
      { value: 'a', label: 'Opción A', selected: true },
      { value: 'b', label: 'Opción B', selected: false },
    ];
    const html = renderToStaticMarkup(
      <ChipRow options={opts} onSelect={vi.fn()} multiSelect />,
    );
    // bg-primary appears for selected option
    expect(html).toMatch(/bg-primary text-primary-foreground/);
  });

  it('unselected option does NOT have bg-primary text-primary-foreground', () => {
    const opts = [{ value: 'a', label: 'Solo', selected: false }];
    const html = renderToStaticMarkup(
      <ChipRow options={opts} onSelect={vi.fn()} />,
    );
    expect(html).not.toMatch(/bg-primary text-primary-foreground/);
  });

  it('multi-select buttons carry aria-pressed attribute', () => {
    const opts = [
      { value: 'a', label: 'Opción A', selected: true },
      { value: 'b', label: 'Opción B', selected: false },
    ];
    const html = renderToStaticMarkup(
      <ChipRow options={opts} onSelect={vi.fn()} multiSelect />,
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('single-select buttons do NOT carry aria-pressed', () => {
    const html = renderToStaticMarkup(
      <ChipRow options={OPTIONS} onSelect={vi.fn()} />,
    );
    expect(html).not.toContain('aria-pressed');
  });

  it('applies tabular-nums class for numeric-label options', () => {
    const numericOpts = [{ value: '60', label: '60 min' }];
    const html = renderToStaticMarkup(
      <ChipRow options={numericOpts} onSelect={vi.fn()} />,
    );
    expect(html).toContain('tabular-nums');
  });

  it('renders a wrapping flex div', () => {
    const html = renderToStaticMarkup(
      <ChipRow options={OPTIONS} onSelect={vi.fn()} />,
    );
    expect(html).toMatch(/class="flex flex-wrap gap-2"/);
  });
});

describe('ChipRow — onSelect wiring', () => {
  it('onSelect is passed as a prop (contract verification)', () => {
    const onSelect = vi.fn();
    // Server-render won't fire onClick, but we confirm the function is injectable
    renderToStaticMarkup(
      <ChipRow options={OPTIONS} onSelect={onSelect} />,
    );
    // onSelect not called during SSR
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('multiSelect defaults to false when not provided', () => {
    const html = renderToStaticMarkup(
      <ChipRow options={[{ value: 'x', label: 'X', selected: true }]} onSelect={vi.fn()} />,
    );
    // Without multiSelect=true, no aria-pressed attribute
    expect(html).not.toContain('aria-pressed');
  });
});
