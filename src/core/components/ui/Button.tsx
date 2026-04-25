import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-semibold tracking-[-0.005em] rounded-[--radius-md]',
    'border border-transparent transition-[background,color,border-color,transform] duration-150 ease-[--ease-out]',
    'active:translate-y-px',
    'focus-visible:outline-none focus-visible:shadow-[--shadow-focus]',
    'disabled:opacity-45 disabled:pointer-events-none select-none cursor-pointer',
  ],
  {
    variants: {
      variant: {
        primary:     'bg-primary text-primary-foreground hover:bg-[--brand-red-dark]',
        secondary:   'bg-card text-foreground border-[--border-strong] hover:bg-secondary',
        ghost:       'bg-transparent text-[--fg-secondary] hover:bg-secondary hover:text-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-110',
        outline:     'border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground',
        accent:      'bg-accent text-accent-foreground hover:brightness-105',
      },
      size: {
        sm: 'h-9  min-w-9  px-3.5 text-xs  rounded-[--radius]',
        md: 'h-11 min-w-11 px-5   text-sm',
        lg: 'h-13 min-w-13 px-6   text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
