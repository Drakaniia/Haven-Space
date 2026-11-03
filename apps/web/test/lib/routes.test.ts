import { test, expect } from 'bun:test';
import {
  BOARDER_LIMITED_NAV,
  BOARDER_NAV,
  LANDLORD_NAV,
  accountHomeEntry,
  getBoarderNav,
} from '../src/lib/nav';
import {
  BOARDER_MESSAGES_PATH,
  BROWSE_LISTINGS_PATH,
  LEGACY_BROWSE_LISTINGS_PATH,
  boarderApplyPath,
  boarderTourPath,
  loginRedirectPath,
  publicDetailPath,
} from '../src/lib/routes';

test('the browse constant points at the public page', () => {
  expect(BROWSE_LISTINGS_PATH).toBe('/find-a-room');
});

test('no nav item points at the retired in-shell browse URL', () => {
  const navs = [
    BOARDER_NAV,
    BOARDER_LIMITED_NAV,
    ...['new', 'accepted', 'confirmed'].map(getBoarderNav),
  ];

  for (const item of [...navs.flat(), ...LANDLORD_NAV]) {
    expect(item.to).not.toBe(LEGACY_BROWSE_LISTINGS_PATH);
    if (item.label === 'Find a Room') expect(item.to).toBe(BROWSE_LISTINGS_PATH);
  }
});

test('path builders target the public detail and the surviving in-shell forms', () => {
  expect(publicDetailPath(12)).toBe('/rooms/12');
  expect(publicDetailPath('12')).toBe('/rooms/12');
  expect(boarderApplyPath(12)).toBe('/boarder/find-a-room/12/apply');
  expect(boarderTourPath(12)).toBe('/boarder/find-a-room/12/tour');
  expect(BOARDER_MESSAGES_PATH).toBe('/boarder/messages');
});

test('login redirects carry an encoded return path', () => {
  expect(loginRedirectPath('/boarder/find-a-room/12/apply')).toBe(
    '/auth/login?redirect=%2Fboarder%2Ffind-a-room%2F12%2Fapply'
  );
});

test('the account menu shows Application for boarders without a confirmed tenancy', () => {
  for (const status of [
    'new',
    'browsing',
    'applied_pending',
    'pending_confirmation',
    'rejected',
    'accepted',
    undefined,
    'unexpected_status',
  ]) {
    expect(accountHomeEntry('boarder', status)).toEqual({
      to: '/boarder/applications',
      label: 'Application',
    });
  }
});

test('the account menu shows Dashboard for confirmed boarders', () => {
  expect(accountHomeEntry('boarder', 'confirmed')).toEqual({
    to: '/boarder',
    label: 'Dashboard',
  });
});

test('the account menu is unchanged for landlords and admins', () => {
  expect(accountHomeEntry('landlord', undefined)).toEqual({ to: '/landlord', label: 'Dashboard' });
  expect(accountHomeEntry('admin', undefined)).toEqual({ to: '/admin', label: 'Dashboard' });
});
