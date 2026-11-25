import { MemoryRouter } from 'react-router';
import type { Meta, StoryObj } from '@storybook/react-vite';
import DashboardPage from './DashboardPage';

const meta = {
  title: 'Dashboard/DashboardPage',
  component: DashboardPage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof DashboardPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoWidgets: Story = {};

export const NoWidgetsDarkTheme: Story = {
  globals: {
    theme: 'dark',
  },
};
