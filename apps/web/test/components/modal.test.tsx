import { test, expect, afterEach } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { ConfirmDialog } from '../src/components/ui/ConfirmDialog';
import { Modal } from '../src/components/ui/Modal';
import { MapModal } from '../src/components/rooms/MapModal';

/**
 * The shared dialog's behaviour, added by spec `find-a-room-map-modal` (D9/D14).
 *
 * These live apart from the map suite because the guarantees are not map-specific: six other
 * surfaces render `Modal`, and they all inherit the scroll lock and focus handling asserted here.
 */
afterEach(cleanup);

/** The backdrop is the sibling that precedes the panel; the panel holds the content. */
function parts() {
  const wrapper = document.querySelector('.fixed.inset-0.z-50');
  if (!wrapper) throw new Error('modal wrapper not rendered');
  const backdrop = wrapper.children[0] as HTMLElement;
  const panel = wrapper.children[1] as HTMLElement;
  return { wrapper, backdrop, panel };
}

test('a closed modal renders nothing at all', () => {
  document.body.style.overflow = '';
  render(
    <Modal open={false} title="Hidden" onClose={() => {}}>
      <button type="button">Inside</button>
    </Modal>
  );

  expect(screen.queryByText('Hidden')).toBeNull();
  expect(screen.queryByText('Inside')).toBeNull();
  expect(document.body.style.overflow).toBe('');
});

test('an open modal renders its title and children', () => {
  render(
    <Modal open title="Leave request" onClose={() => {}}>
      <p>Body copy</p>
    </Modal>
  );

  expect(screen.getByText('Leave request')).toBeDefined();
  expect(screen.getByText('Body copy')).toBeDefined();
});

test('escape, the close button and the backdrop close; a click inside does not', () => {
  let closed = 0;
  const onClose = () => {
    closed += 1;
  };

  render(
    <Modal open title="Add a room" onClose={onClose}>
      <button type="button">Save</button>
    </Modal>
  );

  const { backdrop, panel } = parts();

  fireEvent.click(panel);
  expect(closed).toBe(0);

  fireEvent.click(backdrop);
  expect(closed).toBe(1);

  fireEvent.click(screen.getByLabelText('Close'));
  expect(closed).toBe(2);

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(closed).toBe(3);

  // An unrelated key must not close anything.
  fireEvent.keyDown(window, { key: 'a' });
  expect(closed).toBe(3);
});

test('the page behind cannot scroll while the modal is open', () => {
  document.body.style.overflow = 'auto';
  const { rerender } = render(
    <Modal open title="Properties" onClose={() => {}}>
      <p>Body</p>
    </Modal>
  );
  expect(document.body.style.overflow).toBe('hidden');

  rerender(
    <Modal open={false} title="Properties" onClose={() => {}}>
      <p>Body</p>
    </Modal>
  );
  // The value we replaced comes back — not an unconditional reset.
  expect(document.body.style.overflow).toBe('auto');

  document.body.style.overflow = '';
});

test('the scroll lock is released when the modal unmounts while open', () => {
  document.body.style.overflow = '';
  const { unmount } = render(
    <Modal open title="Properties" onClose={() => {}}>
      <p>Body</p>
    </Modal>
  );
  expect(document.body.style.overflow).toBe('hidden');

  unmount();
  expect(document.body.style.overflow).toBe('');
});

test('focus moves into the panel on open and returns to the trigger on close', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Map
        </button>
        <Modal open={open} title="Find boarding houses near you" onClose={() => setOpen(false)}>
          <button type="button">Use my location</button>
        </Modal>
      </>
    );
  }

  render(<Harness />);
  const trigger = screen.getByText('Map');
  trigger.focus();
  fireEvent.click(trigger);

  // The close button is the panel's first focusable, so that is where focus starts.
  expect(document.activeElement).toBe(screen.getByLabelText('Close'));

  fireEvent.click(screen.getByLabelText('Close'));
  expect(document.activeElement).toBe(trigger);
});

test('tab cycles inside the panel instead of escaping it', () => {
  render(
    <Modal open title="Find boarding houses near you" onClose={() => {}}>
      <button type="button">Use my location</button>
    </Modal>
  );

  const { panel } = parts();
  const close = screen.getByLabelText('Close');
  const last = screen.getByText('Use my location');

  // Forward from the last element wraps back to the first.
  last.focus();
  fireEvent.keyDown(panel, { key: 'Tab' });
  expect(document.activeElement).toBe(close);

  // Backwards from the first element wraps to the last.
  close.focus();
  fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(last);

  // A tab from a non-boundary element is left to the browser.
  close.focus();
  fireEvent.keyDown(panel, { key: 'Tab' });
  expect(document.activeElement).toBe(close);
});

test('focus cannot escape the dialog, even from inside the embedded map', () => {
  render(
    <>
      <a href="/behind">Behind the dialog</a>
      <Modal open title="Find boarding houses near you" onClose={() => {}}>
        <iframe title="Haven Space map" src="about:blank" />
      </Modal>
    </>
  );

  const { panel } = parts();
  // A `Tab` pressed while an iframe has focus fires in the *iframe's* document, so the panel's
  // keydown handler never sees it — verified in Chrome, where focus escaped to a nav link behind the
  // dialog. The guard watches where focus lands instead.
  const outside = screen.getByText('Behind the dialog');
  fireEvent.focusIn(outside);

  expect(panel.contains(document.activeElement)).toBe(true);
  expect(document.activeElement).toBe(screen.getByLabelText('Close'));
});

// --- Panel sizing (spec `modal-desktop-width`) -----------------------------------------------

/**
 * One row per tier: the width a phone gets and the wider cap desktop gets.
 *
 * The phone width is asserted because it must not drift — every `sm:`-less value here is what the
 * app shipped before this spec, and a phone should not notice any of it.
 */
const TIERS = [
  { size: 'md' as const, phone: 'max-w-lg', desktop: 'sm:max-w-2xl' },
  { size: 'lg' as const, phone: 'max-w-2xl', desktop: 'sm:max-w-4xl' },
  { size: 'xl' as const, phone: 'max-w-4xl', desktop: 'sm:max-w-6xl' },
];

test('every size keeps its phone width and gains a wider desktop cap', () => {
  for (const tier of TIERS) {
    const { unmount } = render(
      <Modal open size={tier.size} title="Sized" onClose={() => {}}>
        <p>Body</p>
      </Modal>
    );

    // Exact class match, so `max-w-2xl` as part of `sm:max-w-2xl` cannot satisfy the phone check.
    const classes = parts().panel.className.split(/\s+/);
    expect(classes).toContain(tier.phone);
    expect(classes).toContain(tier.desktop);
    // The regression guard: without the `sm:` class the panel never grows on desktop at all.
    expect(classes).not.toContain(tier.desktop.replace('sm:', ''));

    unmount();
  }
});

test('the panel keeps its height cap and still scrolls when content is taller', () => {
  // A 70vh map plus a title row can exceed the panel on a short window; the cap and the scroll are
  // what keep that from running off-screen. Widening the panel must not have cost either.
  render(
    <Modal open title="Tall" onClose={() => {}}>
      <p>Body</p>
    </Modal>
  );

  const { panel } = parts();
  expect(panel.className).toContain('max-h-[90vh]');
  expect(panel.className).toContain('overflow-y-auto');
});

test('the map dialog takes the widest panel and a taller frame on desktop', () => {
  // The request this spec exists for: the `/find-a-room` map dialog used to open at 512px.
  const { container } = render(<MapModal open onClose={() => {}} />);

  expect(parts().panel.className).toContain('sm:max-w-6xl');

  const frame = container.querySelector('iframe');
  expect(frame).not.toBeNull();
  expect(frame?.className).toContain('h-[60vh]');
  expect(frame?.className).toContain('sm:h-[70vh]');
});

test('confirm prompts stay compact', () => {
  render(
    <ConfirmDialog
      open
      title="Delete announcement"
      message="This cannot be undone."
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  );

  // ConfirmDialog owns its overlay, so the size class lives on the overlay's only child.
  const panel = screen.getByRole('dialog').firstElementChild as HTMLElement;
  expect(panel.className).toContain('max-w-md');
  expect(panel.className).not.toMatch(/sm:max-w-/);
});

test('a dialog that is already open on first render has no trigger to hand focus back to', () => {
  // `restoreFocusRef` captures whatever held focus when the dialog opened. If it was open at mount
  // there is no such element, and the documented fallback is the document — never a random element,
  // and never a throw. (The usual flow, where a click opens the dialog, is covered above.)
  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <Modal open={open} title="Find boarding houses near you" onClose={() => setOpen(false)}>
        <button type="button">Use my location</button>
      </Modal>
    );
  }

  render(<Harness />);
  fireEvent.click(screen.getByLabelText('Close'));

  expect(document.activeElement).toBe(document.body);
});
