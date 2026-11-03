import { test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Button } from '../src/components/ui/Button';

test('Button renders its children', () => {
  render(<Button>Save</Button>);
  expect(screen.getByText('Save')).toBeDefined();
});
