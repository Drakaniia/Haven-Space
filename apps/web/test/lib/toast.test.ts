import { test, expect } from 'bun:test';
import { readPendingToast, setPendingToast } from '../src/lib/toast';

test('setPendingToast round-trips through sessionStorage', () => {
  setPendingToast('success', 'Welcome back, Test!');
  expect(readPendingToast()).toEqual({
    tone: 'success',
    message: 'Welcome back, Test!',
    duration: undefined,
  });
});

test('setPendingToast stores an explicit duration', () => {
  setPendingToast('error', 'Something went wrong', 6000);
  expect(readPendingToast()).toEqual({
    tone: 'error',
    message: 'Something went wrong',
    duration: 6000,
  });
});

test('readPendingToast clears the stored toast', () => {
  setPendingToast('info', 'Logged out');
  expect(readPendingToast()).not.toBeNull();
  expect(readPendingToast()).toBeNull();
});

test('readPendingToast returns null when nothing is stored', () => {
  expect(readPendingToast()).toBeNull();
});

test('readPendingToast rejects an unknown tone', () => {
  sessionStorage.setItem('haven_toast_pending', JSON.stringify({ tone: 'fancy', message: 'hi' }));
  expect(readPendingToast()).toBeNull();
});

test('readPendingToast rejects a missing or blank message', () => {
  sessionStorage.setItem('haven_toast_pending', JSON.stringify({ tone: 'success', message: '  ' }));
  expect(readPendingToast()).toBeNull();

  sessionStorage.setItem('haven_toast_pending', JSON.stringify({ tone: 'success' }));
  expect(readPendingToast()).toBeNull();
});

test('readPendingToast rejects malformed JSON', () => {
  sessionStorage.setItem('haven_toast_pending', 'not-json');
  expect(readPendingToast()).toBeNull();
});

test('setPendingToast tolerates unavailable storage', () => {
  const original = sessionStorage.setItem;
  sessionStorage.setItem = () => {
    throw new Error('quota exceeded');
  };
  try {
    expect(() => setPendingToast('success', 'hi')).not.toThrow();
  } finally {
    sessionStorage.setItem = original;
  }
});
