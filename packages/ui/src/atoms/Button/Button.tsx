import { forwardRef } from 'react';
import { Spinner } from '../Spinner';
import type { ButtonProps } from './Button.types';

// Primary sits solid ON glass (never glass-on-glass for the main CTA).
const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-white/90 text-slate-900 shadow-lg shadow-black/10 hover:bg-white',
  secondary: 'glass-thin text-white/90 hover:bg-white/15',
  ghost: 'bg-transparent text-white/80 hover:bg-white/10 hover:text-white',
  danger: 'bg-red-500/90 text-white shadow-lg shadow-black/10 hover:bg-red-500',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-4 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

const spinnerSize: Record<NonNullable<ButtonProps['size']>, 'sm' | 'md'> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading,
      fullWidth,
      disabled,
      children,
      className = '',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold
        transition duration-200 ease-out active:scale-95
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60
        disabled:pointer-events-none disabled:opacity-50
        ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {isLoading && <Spinner size={spinnerSize[size]} />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
