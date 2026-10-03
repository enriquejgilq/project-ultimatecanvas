import type { Meta, StoryObj } from '@storybook/react-vite';
import { PasswordField } from './PasswordField';

const meta: Meta<typeof PasswordField> = {
  title: 'Molecules/PasswordField',
  component: PasswordField,
  args: {
    id: 'password',
    'aria-label': 'Contraseña',
    showLabel: 'Mostrar',
    hideLabel: 'Ocultar',
    autoComplete: 'new-password',
  },
};

export default meta;
type Story = StoryObj<typeof PasswordField>;

export const Default: Story = {};
export const Invalid: Story = { args: { invalid: true, defaultValue: 'corta' } };
