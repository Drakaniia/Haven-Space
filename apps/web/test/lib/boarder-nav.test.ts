import { test, expect } from 'bun:test';
import { BOARDER_LIMITED_NAV, BOARDER_NAV, getBoarderNav } from '../src/lib/nav';

const FULL_TO = BOARDER_NAV.map(item => item.to);
// Find a Room leaves the boarder shell: the in-shell grid was retired and now
// redirects to the public /find-a-room page (spec boarder-find-a-room-redirect).
const LIMITED_TO = ['/boarder/applications', '/find-a-room', '/boarder/settings'];

test('confirmed boarders get the full sidebar', () => {
  expect(getBoarderNav('confirmed')).toEqual(BOARDER_NAV);
  expect(getBoarderNav('confirmed').map(item => item.to)).toEqual(FULL_TO);
});

test('every non-confirmed status gets only Applications, Find a Room, Settings', () => {
  const statuses = [
    'new',
    'browsing',
    'applied_pending',
    'pending_confirmation',
    'rejected',
    'accepted',
    '',
    'unexpected_status',
  ];
  for (const status of statuses) {
    expect(getBoarderNav(status).map(item => item.to)).toEqual(LIMITED_TO);
  }
});

test('an unknown/undefined status fails safe to the limited sidebar (R14)', () => {
  expect(getBoarderNav(undefined).map(item => item.to)).toEqual(LIMITED_TO);
});

test('tenancy-only destinations are hidden pre-tenancy', () => {
  const hidden = [
    '/boarder',
    '/boarder/tenancy',
    '/boarder/messages',
    '/boarder/announcements',
    '/boarder/payments',
    '/boarder/house-rules',
  ];
  const limited = new Set(getBoarderNav('accepted').map(item => item.to));
  for (const to of hidden) {
    expect(limited.has(to)).toBe(false);
  }
});

test('limited nav collapses into a single Main group (R4)', () => {
  const groups = new Set(getBoarderNav('new').map(item => item.group));
  expect(groups).toEqual(new Set(['Main']));
});

test('full nav keeps its original multi-group layout', () => {
  const groups = new Set(getBoarderNav('confirmed').map(item => item.group));
  expect(groups.size).toBeGreaterThan(1);
});
