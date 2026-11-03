import { test, expect } from 'bun:test';
import { getApiBaseUrl } from '../src/lib/config';

test('getApiBaseUrl returns the production URL outside the browser', () => {
  expect(getApiBaseUrl()).toBe('https://haven-space-api.floresaybaez574.workers.dev');
});
