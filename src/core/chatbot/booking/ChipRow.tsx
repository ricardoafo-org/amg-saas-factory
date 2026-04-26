'use client';

type ChipOption = {
  value: string;
  label: string;
  selected?: boolean;
};

type Props = {
  options: ChipOption[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
};

/**
 * Renders an array of clickable pill chips.
 * Single-select: clicking any chip calls onSelect immediately.
 * Multi-select: toggles selected state; caller tracks selection in state.
 * Tabular numerals applied for numeric labels.
 */
export function ChipRow({ options, onSelect, multiSelect = false }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role={multiSelect ? 'group' : undefined}>
      {options.map((opt) => {
        const isSelected = opt.selected ?? false;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            aria-pressed={multiSelect ? isSelected : undefined}
            className={[
              'inline-flex items-center justify-center',
              'px-3.5 py-1.5 rounded-full',
              'text-sm font-medium',
              'border transition-all duration-150',
              'font-variant-numeric tabular-nums',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              isSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
