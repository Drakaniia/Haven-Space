import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { Icon } from './Icon';

/**
 * The app's right-side drawer (spec `landlord-payments-monitoring` D25/§8.1).
 *
 * It exists because the Payments page needs a panel that leaves the table
 * *visible* behind it: no dimming scrim on desktop, so the landlord keeps their
 * place in the ledger while reviewing a proof. Under `md` the same panel becomes
 * a full-screen detail page, which is the only honest way to show it on a phone.
 *
 * Everything else follows `Modal`'s contract — focus moves in on open, Tab is
 * trapped, Escape closes, focus returns to whatever opened it — so the drawer is
 * a dialog to a keyboard user even though it looks like a side panel.
 */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const WIDTHS = {
  md: 'md:max-w-[420px]',
  lg: 'md:max-w-[520px]',
} as const;

export function Drawer({
  open,
  title,
  eyebrow,
  subtitle,
  onClose,
  children,
  footer,
  width = 'md',
  suspended = false,
}: {
  open: boolean;
  /** Becomes the accessible name (`aria-labelledby`) and the visible heading. */
  title: string;
  /** Quiet line above the title, e.g. `PAYMENT SUBMISSION`. */
  eyebrow?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned action area under the scrolling body. */
  footer?: ReactNode;
  width?: keyof typeof WIDTHS;
  /**
   * Another dialog (the composer, the reject confirmation, the payment recorder)
   * is open on top of this drawer: stand down. Two focus traps over the same
   * document fight each other, and two Escape handlers would close both layers
   * at once.
   */
  suspended?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const lockedOverflowRef = useRef<string | null>(null);
  const isOpenRef = useRef(false);
  // Read inside the focus guard without re-running the mount effect (which would
  // hand focus back to the trigger every time a dialog opened above).
  const suspendedRef = useRef(suspended);
  suspendedRef.current = suspended;

  useEffect(() => {
    if (!open) return;

    isOpenRef.current = true;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    lockedOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panelRef.current
      ?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ?.focus({ preventScroll: true });

    // Same last-line-of-defence as `Modal`: watch where focus lands, not which
    // key was pressed, so nothing behind the drawer can be reached by click
    // focus either.
    function handleFocusIn(event: FocusEvent) {
      if (!isOpenRef.current || suspendedRef.current) return;
      const panel = panelRef.current;
      if (!panel) return;
      if (event.target instanceof Node && panel.contains(event.target)) return;
      panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus({ preventScroll: true });
    }

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      isOpenRef.current = false;

      if (lockedOverflowRef.current !== null) {
        document.body.style.overflow = lockedOverflowRef.current;
        lockedOverflowRef.current = null;
      }

      const previous = restoreFocusRef.current;
      restoreFocusRef.current = null;

      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open || suspended) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, suspended, onClose]);

  /** Tab / Shift+Tab stay inside the panel. */
  function handlePanelKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab' || suspended) return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && (active === last || !panel.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handlePanelKeyDown}
        className={`absolute inset-y-0 right-0 flex w-full flex-col border-l border-border bg-surface shadow-pop ${WIDTHS[width]}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] uppercase tracking-wide text-gray-ink">{eyebrow}</p>
            ) : null}
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-sm text-gray-ink">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-ink transition-colors duration-100 hover:bg-subtle active:scale-[0.97]"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? <footer className="border-t border-border px-5 py-4">{footer}</footer> : null}
      </aside>
    </div>
  );
}
