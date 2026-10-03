import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Molecules/Alert',
  component: Alert,
  argTypes: { variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] } },
  args: { children: 'Si los datos son correctos, recibirás un correo en unos minutos.' },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Info: Story = { args: { variant: 'info' } };
export const Success: Story = { args: { variant: 'success', title: 'Correo verificado' } };
export const Warning: Story = { args: { variant: 'warning' } };
export const Danger: Story = {
  args: { variant: 'danger', children: 'Correo o contraseña incorrectos.' },
};
