/**
 * UI fixtures for the landlord dashboard (spec `landlord-dashboard-redesign`).
 *
 * These values are **not real revenue or maintenance data**. They exist so the
 * design can render before the revenue-history endpoint and the maintenance
 * feature exist (D2/D17). Replace them, do not extend them.
 */

export interface RevenuePoint {
  /** `YYYY-MM`, Manila month. */
  month: string;
  /** Short axis label, e.g. "May". */
  label: string;
  /** Money actually collected in the month, in PHP. */
  collected: number;
}

/** The mockup's six-point cadence, oldest first; the last point is ₱58,500. */
const SAMPLE_COLLECTED = [38_500, 41_200, 39_800, 46_500, 51_000, 58_500];

/**
 * Six trailing months ending with the current month. Pure and deterministic for
 * a supplied `now`, so the axis always reflects today rather than May–Oct.
 */
export function revenueTrend(now: Date = new Date()): RevenuePoint[] {
  const labelFormat = new Intl.DateTimeFormat('en-PH', { month: 'short' });

  return SAMPLE_COLLECTED.map((collected, index) => {
    const offset = index - (SAMPLE_COLLECTED.length - 1);
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    return { month, label: labelFormat.format(date), collected };
  });
}

/** UI fixture — no maintenance feature exists yet (spec D17). */
export const maintenanceRequests = 2;
