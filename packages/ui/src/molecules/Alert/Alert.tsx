import type { AlertProps } from './Alert.types';

const variantClasses: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'bg-[var(--color-info-bg)] border-[var(--color-info-border)] text-[var(--color-info-fg)]',
  success:
    'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success-fg)]',
  warning:
    'bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-[var(--color-warning-fg)]',
  danger:
    'bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger-fg)]',
};

export function Alert({ variant = 'info', title, children, className = '' }: AlertProps) {
  // Errors and warnings interrupt (alert); confirmations are announced politely (status).
  const role = variant === 'danger' || variant === 'warning' ? 'alert' : 'status';
  return (
    <div
      role={role}
      className={`rounded-[var(--radius-control)] border px-4 py-3 text-sm ${variantClasses[variant]} ${className}`}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children && <div className="space-y-2">{children}</div>}
    </div>
  );
}
