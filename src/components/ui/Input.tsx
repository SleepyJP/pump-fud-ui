'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-text-secondary text-sm mb-1 font-mono">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2 bg-dark-secondary border-2 border-border-primary rounded',
            'font-mono text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:border-fud-green focus:shadow-[0_0_10px_rgba(0,255,0,0.2)]',
            'transition-all duration-200',
            error && 'border-fud-red focus:border-fud-red',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-fud-red text-xs font-mono">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
