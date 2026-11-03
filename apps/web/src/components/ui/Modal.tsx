import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

/**
 * Panel widths, one step per tier on mobile and a wider cap from 640px up (spec
 * `modal-desktop-width` D3/D5). The base class is the width a phone gets and is unchanged from what
 * the app shipped; the `sm:` class is the desktop size.
 *
 * The cap is a *maximum*, never a fixed width — the panel is `w-full` inside a `p-4` flex container,
 * so a cap wider than the viewport simply falls back to the viewport width. Nothing here can cause
 * horizontal overflow.
 */
const SIZES = {
  md: 'max-w-lg sm:max-w-2xl',
  lg: 'max-w-2xl sm:max-w-4xl',
  xl: 'max-w-4xl sm:max-w-6xl',
} as const;

/**
 * Everything inside the panel that can take focus, in DOM order.
 *
 * The map `<iframe>` is deliberately in this list: an embedded map is a real tab stop, so leaving it
 * out would let Tab escape the dialog (spec `find-a-room-map-modal` R2).
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /**
   * `md` (the default) is the form/reading size: 512px on a phone, 672px from 640px up. Data-heavy
   * panels — the map dialog, verification documents — opt into `xl` (896px → 1152px).
   */
  size?: keyof typeof SIZES;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  /** Whatever held focus before the dialog opened, so it can be handed back on close. */
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  /** The `overflow` we replaced; `null` means this instance is not currently holding the lock. */
  const lockedOverflowRef = useRef<string | null>(null);
  /** False the instant this dialog starts closing, so the guard below stops pulling focus back. */
  const isOpenRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]); // Body scroll lock + focus hand-off (spec R1/R3). Behaviour only — the markup below is unchanged.
  useEffect(() => {
    if (!open) return;

    isOpenRef.current = true;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    lockedOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog so the trap and screen readers start in the right place.
    panelRef.current
      ?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ?.focus({ preventScroll: true });

    /**
     * Last line of the trap.
     *
     * `handlePanelKeyDown` cannot see a `Tab` pressed while the embedded map has focus: the map is a
     * separate document, so the key event never reaches this one (verified in Chrome — focus escaped
     * to a nav link behind the dialog). Watching where focus *lands* instead of which key was pressed
     * catches that case regardless of how focus left, including the iframe.
     */
    function handleFocusIn(event: FocusEvent) {
      if (!isOpenRef.current) return;
      const panel = panelRef.current;
      if (!panel) return;
      if (event.target instanceof Node && panel.contains(event.target)) return;
      panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus({ preventScroll: true });
    }
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      // Removed before focus is handed back, so restoring to a trigger outside the panel is not
      // itself treated as an escape.
      document.removeEventListener('focusin', handleFocusIn);
      isOpenRef.current = false;

      // Restore what we replaced, and only what we replaced — a second modal opened over this one
      // has its own saved value, so releasing in the wrong order cannot strand `hidden` on the body.
      if (lockedOverflowRef.current !== null) {
        document.body.style.overflow = lockedOverflowRef.current;
        lockedOverflowRef.current = null;
      }
      const previous = restoreFocusRef.current;
      restoreFocusRef.current = null;
      // Only pull focus back if that element is still on the page (the route may have changed).
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [open]);

  /** Tab / Shift+Tab cycle inside the panel (spec R2). */
  function handlePanelKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || !panel.contains(active))) {
      e.preventDefault();
      last.focus();
      return;
    }
    if (!e.shiftKey && (active === last || !panel.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            onKeyDown={handlePanelKeyDown}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className={`relative w-full ${SIZES[size]} max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-surface/90 p-6 shadow-pop backdrop-blur-xl`}
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="rounded-full p-1.5 hover:bg-ink/5 active:scale-[0.97] transition-all duration-100 ease-out"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
