import type { AuthLayoutProps } from './AuthLayout.types';

/** Centered glass card used by every access screen (login, register, recovery…). */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="glass-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <section className="glass-thick glass-highlight rounded-[var(--glass-radius-lg)] p-8">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold text-[var(--color-on-glass)]">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm text-[var(--color-on-glass-muted)]">{subtitle}</p>
            )}
          </header>
          {children}
        </section>
        {footer && (
          <div className="mt-6 text-center text-sm text-[var(--color-on-glass-muted)]">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
