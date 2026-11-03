/**
 * Shared navigation destinations (spec `boarder-find-a-room-redirect`).
 *
 * Browsing listings lives on the public `/find-a-room` page. The boarder shell
 * used to render its own copy of the grid and listing detail at
 * `/boarder/find-a-room`; those URLs are now aliases that redirect here. Keeping
 * the paths in one module is what stops the two trees from drifting apart again,
 * so prefer these constants over literal path strings.
 */

/** Public browse grid — the single listings surface for every visitor. */
export const BROWSE_LISTINGS_PATH = '/find-a-room';

/**
 * Retired in-shell browse grid. Kept as an alias so bookmarks and older links
 * keep resolving, and as the base for the apply/tour routes that still live
 * inside the boarder shell.
 */
export const LEGACY_BROWSE_LISTINGS_PATH = '/boarder/find-a-room';

/** Public listing detail (`/rooms/12`). */
export function publicDetailPath(id: string | number): string {
  return `/rooms/${id}`;
}

/** In-shell application form — the public detail's Apply target for boarders. */
export function boarderApplyPath(id: string | number): string {
  return `${LEGACY_BROWSE_LISTINGS_PATH}/${id}/apply`;
}

/** In-shell tour booking form. */
export function boarderTourPath(id: string | number): string {
  return `${LEGACY_BROWSE_LISTINGS_PATH}/${id}/tour`;
}

/** In-shell message thread (contact-owner CTA for a signed-in boarder). */
export const BOARDER_MESSAGES_PATH = '/boarder/messages';

/** Login screen that returns the visitor to `path` once they authenticate. */
export function loginRedirectPath(path: string): string {
  return `/auth/login?redirect=${encodeURIComponent(path)}`;
}
