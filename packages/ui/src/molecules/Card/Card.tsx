import type { ReactNode } from 'react';

function CardRoot({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`glass glass-highlight rounded-[--glass-radius] p-6 transition duration-300 ease-out hover:scale-[1.02] hover:bg-white/15 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-base font-semibold text-white/95">{children}</div>;
}

function CardBody({ children }: { children: ReactNode }) {
  return <div className="text-sm text-white/75">{children}</div>;
}

export const Card = Object.assign(CardRoot, { Header: CardHeader, Body: CardBody });
