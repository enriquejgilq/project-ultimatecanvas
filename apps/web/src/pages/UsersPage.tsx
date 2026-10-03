import { Button, Card, DataTable } from '@ucanvas/ui';
import type { DataTableColumn } from '@ucanvas/ui';
import type { User } from '@ucanvas/shared';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useUsers } from '@/features/users';
import { ROUTES } from '@/lib/router';

const columns: DataTableColumn<User>[] = [
  { key: 'name', header: 'Name', render: (user) => user.name ?? '—' },
  { key: 'email', header: 'Email', render: (user) => user.email },
  {
    key: 'createdAt',
    header: 'Created',
    render: (user) => new Date(user.createdAt).toLocaleDateString(),
  },
];

export function UsersPage() {
  const { data, isLoading, isError, error, refetch } = useUsers();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <main className="glass-bg home-page">
      <nav className="users-page__account" aria-label="Cuenta">
        <span>{user?.email}</span>
        <Link className="auth-link" to={ROUTES.accountSecurity}>
          Seguridad de la cuenta
        </Link>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </nav>
      <Card className="users-page__card">
        <Card.Header>Users</Card.Header>
        <Card.Body>
          {isError ? (
            <div className="users-page__error">
              <p>
                Could not load users: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <Button variant="secondary" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={data ?? []}
              getRowKey={(user) => user.id}
              isLoading={isLoading}
              emptyMessage="No users yet."
            />
          )}
        </Card.Body>
      </Card>
    </main>
  );
}
