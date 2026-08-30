import { Button, Card } from '@ucanvas/ui';
import { Link } from 'react-router-dom';
import { HealthStatus } from '@/features/health';
import { ROUTES } from '@/lib/router';

export function HomePage() {
  return (
    <main className="glass-bg home-page">
      <Card className="home-page__card">
        <Card.Header>project-ultimatecanvas</Card.Header>
        <Card.Body>
          <HealthStatus />
        </Card.Body>
      </Card>
      <Button variant="primary">Get started</Button>
      <Link to={ROUTES.users} className="home-page__link">
        View users
      </Link>
    </main>
  );
}
