'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'font-mono font-semibold transition-all duration-200 rounded border-2 flex items-center justify-center gap-2';

    const variants = {
      primary:
        'bg-fud-green text-black border-fud-green hover:bg-fud-green-bright hover:border-fud-green-bright hover:shadow-[0_0_20px_rgba(0,255,0,0.5)] active:scale-95',
      secondary:
        'bg-transparent text-fud-green border-fud-green hover:bg-fud-green/10 hover:shadow-[0_0_10px_rgba(0,255,0,0.3)] active:scale-95',
      danger:
        'bg-fud-red text-white border-fud-red hover:bg-red-600 hover:border-red-600 hover:shadow-[0_0_20px_rgba(255,0,0,0.5)] active:scale-95',
      ghost:
        'bg-transparent text-text-secondary border-transparent hover:text-fud-green hover:border-fud-green/30 active:scale-95',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
