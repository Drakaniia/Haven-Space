import type { ReactNode } from 'react';

/**
 * Surface primitive — opaque and elevated, matching the app-wide language
 * already used by `RoomDetailView`, `FindARoomContent` and the public pages
 * (`rounded-2xl` + `shadow-card`).
 *
 * Deliberately **opaque**: translucent material is reserved for floating chrome
 * (topbar, sidebar) and floating layers (modal, menus, toasts). Never stack one
 * translucent surface on another — legibility collapses (apple-design §12).
 */
export function Card({
  className = '',
  padding = 'p-5',
  children,
}: {
  className?: string;
  /**
   * Padding utilities, defaulting to the app-wide `p-5`. Override it only to
   * control internal padding on a single surface (e.g. a card that splits its
   * own header/body/footer rows) — the border, radius and shadow stay owned by
   * this primitive so every card keeps the same silhouette.
   */
  padding?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface ${padding} shadow-card ${className}`}
    >
      {children}
    </div>
  );
}
