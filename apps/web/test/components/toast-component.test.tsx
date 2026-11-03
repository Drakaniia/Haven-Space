import { afterEach, test, expect } from 'bun:test';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ToastStack } from '../src/components/ui/Toast';

// Auto-cleanup isn't registered in this environment; unmount between tests so
// queries never see elements from a previous render.
afterEach(() => cleanup());

test('ToastStack renders each toast message in a polite live region', () => {
  render(
    <ToastStack
      toasts={[
        { id: '1', tone: 'success', message: 'Booking confirmed!' },
        { id: '2', tone: 'error', message: 'Something failed' },
      ]}
      onDismiss={() => {}}
    />
  );

  expect(screen.getByText('Booking confirmed!')).toBeDefined();
  expect(screen.getByText('Something failed')).toBeDefined();
  // aria-live="polite" surfaces as role="status"
  expect(screen.getByRole('status')).toBeDefined();
});

test('ToastStack dismiss button calls onDismiss with the toast id', () => {
  let dismissed: string | null = null;
  render(
    <ToastStack
      toasts={[{ id: '42', tone: 'info', message: 'Logged out' }]}
      onDismiss={id => {
        dismissed = id;
      }}
    />
  );

  fireEvent.click(screen.getByLabelText('Dismiss notification'));
  expect(dismissed).toBe('42');
});

test('ToastStack renders an optional action button', () => {
  render(
    <ToastStack
      toasts={[
        {
          id: '1',
          tone: 'success',
          message: 'Saved',
          action: { label: 'View dashboard', onClick: () => {} },
        },
      ]}
      onDismiss={() => {}}
    />
  );

  expect(screen.getByText('View dashboard')).toBeDefined();
});

test('ToastStack renders nothing when there are no toasts', () => {
  const { container } = render(<ToastStack toasts={[]} onDismiss={() => {}} />);
  expect(container.innerHTML).toBe('');
});
