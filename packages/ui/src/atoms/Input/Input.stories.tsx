import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Atoms/Input',
  component: Input,
  args: { placeholder: 'tu@correo.com', 'aria-label': 'Correo' },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const Invalid: Story = { args: { invalid: true, defaultValue: 'no-es-un-correo' } };
export const Disabled: Story = { args: { disabled: true } };
