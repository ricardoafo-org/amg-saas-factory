'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

type Props = {
  id: string;
  policyUrl: string;
  policyVersion: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

export function ConsentCheckbox({ id, policyUrl, policyVersion, checked, onCheckedChange, className }: Props) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(val === true)}
        className={cn(
          'mt-0.5 h-6 w-6 shrink-0 rounded-[--radius-sm] border-2 border-border bg-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
          'transition-colors duration-150',
        )}
        aria-required="true"
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
          <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      <label htmlFor={id} className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
        He leído y acepto el tratamiento de mis datos personales conforme a la{' '}
        <a
          href={policyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:brightness-125"
          onClick={(e) => e.stopPropagation()}
        >
          Política de Privacidad
        </a>{' '}
        <span className="text-xs opacity-60">(v{policyVersion})</span>
      </label>
    </div>
  );
}
