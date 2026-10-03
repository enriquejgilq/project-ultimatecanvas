import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AuthStatus } from '@/features/auth';
import { ProtectedRoute } from './ProtectedRoute';

let mockStatus: AuthStatus = 'bootstrapping';
vi.mock('@/features/auth', () => ({ useAuth: () => ({ status: mockStatus }) }));

function LoginProbe() {
  const location = useLocation();
  return <p data-testid="login">{location.pathname + location.search}</p>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <p>private content</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('shows a spinner and no private content while bootstrapping', () => {
    mockStatus = 'bootstrapping';
    renderAt('/users');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('private content')).not.toBeInTheDocument();
  });

  it('sends anonymous users to login with the full return path', () => {
    mockStatus = 'anonymous';
    renderAt('/users?page=2');
    expect(screen.getByTestId('login')).toHaveTextContent('/login?returnTo=%2Fusers%3Fpage%3D2');
    expect(screen.queryByText('private content')).not.toBeInTheDocument();
  });

  it('renders the page with a session', () => {
    mockStatus = 'authenticated';
    renderAt('/users');
    expect(screen.getByText('private content')).toBeInTheDocument();
  });
});
