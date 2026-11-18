import { ButtonHTMLAttributes, forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cx } from './utils';

export type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconOnly?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-usnee-brand text-white hover:bg-usnee-brand2 active:bg-usnee-brand2 disabled:border-usnee-border disabled:bg-usnee-surface2 disabled:text-usnee-text3',
  secondary: 'border-usnee-border bg-usnee-surface2 text-usnee-text hover:border-usnee-borderStrong hover:bg-usnee-surface3',
  glass: 'border-usnee-borderSubtle bg-usnee-surface text-usnee-text hover:border-usnee-border hover:bg-usnee-surface2',
  danger: 'border-transparent bg-usnee-danger text-white hover:bg-usnee-accent disabled:border-usnee-border disabled:bg-usnee-surface2 disabled:text-usnee-text3',
  ghost: 'border-transparent bg-transparent text-usnee-text2 hover:bg-usnee-surface2'
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-12 px-4 text-xs',
  md: 'min-h-12 px-5 text-sm',
  lg: 'min-h-14 px-6 text-base'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconOnly = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition-colors duration-normal ease-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus focus-visible:ring-offset-2 focus-visible:ring-offset-usnee-bg disabled:cursor-not-allowed disabled:opacity-45',
        variants[variant],
        iconOnly ? 'h-12 w-12 p-0' : sizes[size],
        className
      )}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  );
});
