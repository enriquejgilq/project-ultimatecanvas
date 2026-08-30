import { useHealth } from '../hooks/useHealth';

export function HealthStatus() {
  const { health, error, loading } = useHealth();

  if (loading) return <p>Checking API status…</p>;
  if (error) return <p>API unreachable: {error}</p>;

  return (
    <p>
      API status: <strong>{health?.status}</strong> (uptime {Math.round(health?.uptime ?? 0)}s)
    </p>
  );
}
