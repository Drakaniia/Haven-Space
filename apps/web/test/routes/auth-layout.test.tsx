import { test, expect, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

// `Link` needs a router context; the layout itself is what is under test, so stub the link.
mock.module('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

const { AuthSplitLayout, AUTH_PANEL_IMAGE, AUTH_PANEL_IMAGE_ALT } = await import(
  '../src/components/auth/AuthSplitLayout'
);

// Regression: `/auth/choose-role` and the signup pages used to fall back to the retired
// `login_right.png` artwork and stack the old caption overlay on top of it, which is why they
// looked dated next to `/auth/login` (spec `auth-hero-map-locale`).
test('the auth panel defaults to the new hero artwork', () => {
  expect(AUTH_PANEL_IMAGE).toBe('/assets/images/public/login_hero.webp');
  expect(AUTH_PANEL_IMAGE_ALT).toBe(
    'Find your haven, right next door. Verified boarding houses near you, managed by trusted landlords.'
  );
});

test('AuthSplitLayout renders the hero with the tagline alt text', () => {
  render(
    <AuthSplitLayout title="Choose how to continue" subtitle="Welcome to Haven Space">
      <button type="button">Boarder</button>
    </AuthSplitLayout>
  );

  expect(screen.getByAltText(AUTH_PANEL_IMAGE_ALT).getAttribute('src')).toBe(AUTH_PANEL_IMAGE);
  expect(screen.getByText('Choose how to continue')).toBeDefined();
  expect(screen.getByText('Welcome to Haven Space')).toBeDefined();
  expect(screen.getByText('Boarder')).toBeDefined();
});

test('the retired caption overlay no longer renders', () => {
  render(<AuthSplitLayout title="Welcome Back!">content</AuthSplitLayout>);

  expect(screen.queryByText(/Find your haven/)).toBeNull();
  expect(screen.queryByText(/Verified boarding houses near you/)).toBeNull();
});
