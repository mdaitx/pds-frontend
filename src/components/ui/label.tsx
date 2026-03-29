import type { LabelHTMLAttributes, ReactNode } from 'react';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  className?: string;
  children: ReactNode;
};

export function Label({ className = '', children, ...props }: LabelProps) {
  return (
    <label
      className={['text-sm font-medium text-zinc-700', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </label>
  );
}
