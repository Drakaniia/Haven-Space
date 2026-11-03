import { test, expect } from 'bun:test';
import { isPhilippinePhone } from '../src/lib/validation';

test('accepts a standard 09 phone number', () => {
  expect(isPhilippinePhone('09171234567')).toBe(true);
});

test('accepts a +63 number with formatting', () => {
  expect(isPhilippinePhone('+63 917 123 4567')).toBe(true);
});

test('accepts a 63-prefixed number', () => {
  expect(isPhilippinePhone('639171234567')).toBe(true);
});

test('rejects a non-mobile landline number', () => {
  expect(isPhilippinePhone('0281234567')).toBe(false);
});

test('rejects a too-short number', () => {
  expect(isPhilippinePhone('09171234')).toBe(false);
});

test('rejects a number starting with 8', () => {
  expect(isPhilippinePhone('08171234567')).toBe(false);
});
