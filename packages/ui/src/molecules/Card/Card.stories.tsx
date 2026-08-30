import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Molecules/Card',
  component: Card,
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <Card.Header>Plan Pro</Card.Header>
      <Card.Body>Acceso completo a todos los componentes del design system.</Card.Body>
    </Card>
  ),
};
