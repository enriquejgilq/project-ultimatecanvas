import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../../atoms/Button';
import { Checkbox } from '../../atoms/Checkbox';
import { Input } from '../../atoms/Input';
import { FormField } from '../../molecules/FormField';
import { PasswordField } from '../../molecules/PasswordField';
import { AuthLayout } from './AuthLayout';

const meta: Meta<typeof AuthLayout> = {
  title: 'Templates/AuthLayout',
  component: AuthLayout,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AuthLayout>;

export const LoginExample: Story = {
  render: () => (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Accede a tus lienzos."
      footer={<span>¿No tienes cuenta? Crea una</span>}
    >
      <form className="flex flex-col gap-4">
        <FormField label="Correo" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" />
        </FormField>
        <FormField label="Contraseña" htmlFor="password">
          <PasswordField
            id="password"
            autoComplete="current-password"
            showLabel="Mostrar"
            hideLabel="Ocultar"
          />
        </FormField>
        <Checkbox label="Mantener sesión iniciada" />
        <Button type="submit" fullWidth>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  ),
};
