# Component Patterns — Full Code Examples

Copy/adapt these when generating components. All examples: React + TypeScript, Tailwind-style classes (swap for CSS modules if the project uses them, keeping tokens as CSS variables).

## Atom: Button (the canonical pattern)

`components/atoms/Button/Button.types.ts`
```typescript
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}
```

`components/atoms/Button/Button.tsx`
```tsx
import { forwardRef } from 'react';
import { Spinner } from '@/components/atoms';
import type { ButtonProps } from './Button.types';

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-surface border border-border hover:bg-surface-hover',
  ghost: 'bg-transparent hover:bg-surface-hover',
  danger: 'bg-danger text-white hover:bg-danger-hover',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, fullWidth, disabled, children, className = '', ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium
        transition-colors focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:opacity-50 disabled:pointer-events-none
        ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
```

`components/atoms/Button/index.ts`
```typescript
export * from './Button';
export type * from './Button.types';
```

Category barrel `components/atoms/index.ts`:
```typescript
export * from './Button';
export * from './Input';
export * from './Label';
export * from './Spinner';
export * from './Badge';
```

## Molecule: FormField (composition of atoms)

```tsx
import { Label, Input } from '@/components/atoms';
import type { InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function FormField({ label, name, error, hint, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} {...inputProps} />
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
      {error && <p id={`${name}-error`} className="text-sm text-danger">{error}</p>}
    </div>
  );
}
```

## Molecule with subcomponents: Card (composition over configuration)

```tsx
function CardRoot({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-surface ${className}`}>{children}</div>;
}
function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-border px-4 py-3 font-semibold">{children}</div>;
}
function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3">{children}</div>;
}

export const Card = Object.assign(CardRoot, { Header: CardHeader, Body: CardBody });
// Uso: <Card><Card.Header>Título</Card.Header><Card.Body>...</Card.Body></Card>
```

## Organism: generic DataTable (reusable via config, no domain knowledge)

```tsx
interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, isLoading, emptyMessage = 'Sin resultados', getRowId, onRowClick }: DataTableProps<T>) {
  if (isLoading) return <TableSkeleton columns={columns.length} />;
  if (data.length === 0) return <p className="p-6 text-center text-muted">{emptyMessage}</p>;
  return (
    <table className="w-full text-left">
      <thead>
        <tr>{columns.map((c) => <th key={c.key} className="border-b border-border px-3 py-2 text-sm font-medium text-muted">{c.header}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={getRowId(row)} onClick={() => onRowClick?.(row)} className={onRowClick ? 'cursor-pointer hover:bg-surface-hover' : ''}>
            {columns.map((c) => <td key={c.key} className="border-b border-border px-3 py-2">{c.render(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

The feature configures it (domain knowledge lives in the feature, not the organism):

```tsx
// features/users/components/UsersTable.tsx
const columns: Column<User>[] = [
  { key: 'name', header: 'Nombre', render: (u) => u.name },
  { key: 'email', header: 'Email', render: (u) => u.email },
  { key: 'status', header: 'Estado', render: (u) => <Badge variant={u.active ? 'success' : 'neutral'}>{u.active ? 'Activo' : 'Inactivo'}</Badge> },
];
export function UsersTable() {
  const { data, isLoading } = useUsers();
  return <DataTable columns={columns} data={data ?? []} isLoading={isLoading} getRowId={(u) => u.id} />;
}
```

## Template: MainLayout

```tsx
interface MainLayoutProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        {sidebar && <aside className="w-64 border-r border-border">{sidebar}</aside>}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

## Feature slice: service → hook → page

```typescript
// features/users/services/users.service.ts
import { apiClient } from '@/lib/apiClient';
import type { User, CreateUserDto } from '../types';

export const usersService = {
  getAll: () => apiClient.get<User[]>('/users'),
  getById: (id: string) => apiClient.get<User>(`/users/${id}`),
  create: (dto: CreateUserDto) => apiClient.post<User>('/users', dto),
};
```

```typescript
// features/users/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services/users.service';

export const userKeys = { all: ['users'] as const, detail: (id: string) => ['users', id] as const };

export const useUsers = () => useQuery({ queryKey: userKeys.all, queryFn: usersService.getAll });

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}
```

```tsx
// pages/UsersPage.tsx — solo composición
import { MainLayout } from '@/components/templates';
import { UsersTable } from '@/features/users';

export function UsersPage() {
  return (
    <MainLayout>
      <h1 className="mb-4 text-2xl font-bold">Usuarios</h1>
      <UsersTable />
    </MainLayout>
  );
}
```

## Design tokens (`styles/tokens.css`)

```css
:root {
  --color-primary: #4f46e5;
  --color-primary-hover: #4338ca;
  --color-danger: #dc2626;
  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-hover: #f1f5f9;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-muted: #64748b;
  --radius-md: 0.375rem;
  --space-unit: 0.25rem;
}
```

With Tailwind, map these variables in the theme config so classes like `bg-primary` resolve to the tokens — changing the palette then requires editing one file.

## apiClient (`lib/apiClient.ts`)

```typescript
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? 'Request failed');
  return body?.data ?? body; // compatible con el shape { success, data, error } del backend
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const apiClient = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body: unknown) => request<T>(p, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(p: string, body: unknown) => request<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
};
```
