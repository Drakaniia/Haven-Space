/**
 * The property detail page's tab contract (`landlord-property-detail-page`
 * D4/D5/D26/R6).
 *
 * Modelled on the admin console's section contract (`toAdminSectionKey`): the
 * kebab-case keys are the URL contract, an absent or unrecognised value resolves
 * to the default rather than a blank pane, and the lookup never throws. Keeping
 * the keys and labels here means the tab bar, the trail and the tests share one
 * definition instead of each spelling the strings out.
 *
 * `rooms` is a **valid key without a tab** (D26): rooms are managed on their own
 * page, reached from the Overview pane's `Manage rooms` button, so the bar shows
 * only the three panes. Keeping the key means a hand-typed or bookmarked
 * `?tab=rooms` is still understood and forwarded to the rooms page rather than
 * being silently reinterpreted as Overview.
 */

export const PROPERTY_TAB_KEYS = ['overview', 'rooms', 'public-listing', 'applications'] as const;

export type PropertyTabKey = (typeof PROPERTY_TAB_KEYS)[number];

/**
 * The keys the bar renders, in order — every valid key that opens a pane (D26).
 *
 * Kept separate from `PROPERTY_TAB_KEYS` so the one navigation key (`rooms`) can
 * stay addressable in the URL while the bar itself lists panes only.
 */
export const PROPERTY_TAB_BAR_KEYS = ['overview', 'public-listing', 'applications'] as const;

/** Where an absent or unrecognised `?tab=` lands. */
export const DEFAULT_PROPERTY_TAB: PropertyTabKey = 'overview';

export const PROPERTY_TAB_LABELS: Record<PropertyTabKey, string> = {
  overview: 'Overview',
  rooms: 'Rooms',
  'public-listing': 'Public listing',
  applications: 'Applications',
};

/** Non-throwing: an unknown value resolves to the default rather than erroring. */
export function toPropertyTabKey(value: unknown): PropertyTabKey {
  return typeof value === 'string' && (PROPERTY_TAB_KEYS as readonly string[]).includes(value)
    ? (value as PropertyTabKey)
    : DEFAULT_PROPERTY_TAB;
}
