import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center font-semibold tracking-wide',
    'rounded-[--radius] transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer',
  ],
  {
    variants: {
      variant: {
        primary:     'bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.97] shadow-sm',
        secondary:   'bg-secondary text-secondary-foreground hover:brightness-110 active:scale-[0.97]',
        ghost:       'bg-transparent text-foreground hover:bg-muted active:bg-muted/80',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-110 active:scale-[0.97]',
        outline:     'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground',
      },
      size: {
        sm: 'h-9  min-w-9  px-3 text-xs  gap-1.5',
        md: 'h-12 min-w-12 px-5 text-sm  gap-2',
        lg: 'h-14 min-w-14 px-7 text-base gap-2.5',
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
