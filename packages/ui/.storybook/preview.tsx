import type { Preview } from '@storybook/react-vite';
import '../src/styles/index.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="glass-bg flex min-h-[60vh] w-full items-center justify-center p-10 text-white/90">
        <Story />
      </div>
    ),
  ],
};

export default preview;
