import { HTMLAttributes } from 'react';
import { cx } from './utils';

export type SurfaceVariant = 'default' | 'raised' | 'glass' | 'interactive' | 'danger';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
}

const variants: Record<SurfaceVariant, string> = {
  default: 'border-usnee-border bg-usnee-surface',
  raised: 'border-usnee-borderStrong bg-usnee-surface2',
  glass: 'border-usnee-borderSubtle bg-usnee-surface',
  interactive:
    'border-usnee-border bg-usnee-surface transition-colors duration-normal ease-ui hover:border-usnee-borderStrong hover:bg-usnee-surface2',
  danger: 'border-usnee-danger/35 bg-usnee-danger/10'
};

export function Surface({ variant = 'default', className, ...props }: SurfaceProps) {
  return <div className={cx('rounded-card border', variants[variant], className)} {...props} />;
}
