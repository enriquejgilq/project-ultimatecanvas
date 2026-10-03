import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../../atoms/Input';
import { FormField } from './FormField';

const meta: Meta<typeof FormField> = {
  title: 'Molecules/FormField',
  component: FormField,
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const WithHint: Story = {
  render: () => (
    <FormField label="Correo" htmlFor="email" hint="Te enviaremos un enlace de verificación.">
      <Input id="email" type="email" />
    </FormField>
  ),
};

export const WithErrors: Story = {
  render: () => (
    <FormField
      label="Contraseña"
      htmlFor="password"
      error={['Al menos 10 caracteres.', 'Al menos un número.']}
    >
      <Input id="password" type="password" />
    </FormField>
  ),
};
