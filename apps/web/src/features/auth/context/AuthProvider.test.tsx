import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/apiClient';
import { getAccessToken } from '@/lib/authToken';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider } from './AuthProvider';

const SESSION = {
  accessToken: 'token-1',
  expiresIn: 900,
  user: { id: 'u1', email: 'ana@example.com', name: null, emailVerified: true },
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
const ok = (data: unknown) => json(200, { success: true, data, error: null });
const unauthorized = () =>
  json(401, { success: false, data: null, error: { code: 'SESSION_EXPIRED', message: 'x' } });

function Probe() {
  const { status, user, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? ''}</span>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

function renderWithProvider() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('bootstraps as authenticated when the session cookie is valid', async () => {
    fetchMock.mockResolvedValue(ok(SESSION));
    renderWithProvider();
    expect(screen.getByTestId('status')).toHaveTextContent('bootstrapping');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('email')).toHaveTextContent('ana@example.com');
    expect(getAccessToken()).toBe('token-1');
  });

  it('bootstraps as anonymous when refresh answers 401', async () => {
    fetchMock.mockResolvedValue(unauthorized());
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(getAccessToken()).toBeNull();
  });

  it('two requests failing with 401 at once trigger a single refresh, then both retry', async () => {
    fetchMock.mockResolvedValueOnce(ok(SESSION)); // bootstrap
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    let refreshes = 0;
    let usersCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        refreshes += 1;
        return ok({ ...SESSION, accessToken: 'token-2' });
      }
      usersCalls += 1;
      return usersCalls <= 2 ? unauthorized() : ok([]);
    });

    await act(async () => {
      await Promise.all([apiClient.get('/users'), apiClient.get('/users')]);
    });

    expect(refreshes).toBe(1);
    expect(usersCalls).toBe(4);
    expect(getAccessToken()).toBe('token-2');
  });

  it('logout clears the token and becomes anonymous', async () => {
    fetchMock.mockResolvedValueOnce(ok(SESSION));
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await act(async () => {
      screen.getByText('logout').click();
    });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(getAccessToken()).toBeNull();
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe('/api/v1/auth/logout');
    expect(init.headers['X-Requested-With']).toBe('ucanvas');
  });
});
