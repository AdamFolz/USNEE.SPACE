import { ButtonHTMLAttributes } from 'react';
import { cx } from '../ui/utils';

export function ChoiceChip({ selected, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        'min-h-12 rounded-md border px-4 text-body-sm font-bold transition-colors duration-normal focus-visible:ring-2 focus-visible:ring-usnee-focus',
        selected
          ? 'border-usnee-brand bg-usnee-brand/15 text-usnee-brand'
          : 'border-usnee-border bg-usnee-surface text-usnee-text2 hover:border-usnee-borderStrong hover:text-usnee-text',
        className
      )}
      {...props}
    />
  );
}
