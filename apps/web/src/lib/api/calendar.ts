import { getApiBaseUrl } from '../config';
import type { CalendarResponse } from '../types';
import { apiFetch } from './http';

const base = () => getApiBaseUrl();

export interface LandlordCalendarQuery {
  /** Inclusive, `YYYY-MM-DD`. */
  from: string;
  /** Exclusive, `YYYY-MM-DD`. */
  to: string;
  propertyId?: number | null;
  /** Event types and/or families. Omitted means "everything". */
  types?: string[] | null;
}

/** Builds the query string for one calendar window (spec `landlord-calendar` §5.1). */
export function calendarQueryString(query: LandlordCalendarQuery): string {
  const params = new URLSearchParams();

  params.set('from', query.from);
  params.set('to', query.to);

  if (query.propertyId) params.set('propertyId', String(query.propertyId));
  if (query.types && query.types.length > 0) params.set('types', query.types.join(','));

  return `?${params.toString()}`;
}

/**
 * One window of the landlord's aggregated operations calendar.
 *
 * The window is required: the API caps a request at 62 days and the page only
 * ever asks for the visible month's full week matrix, so unbounded aggregation
 * is not reachable from the UI.
 */
export function getLandlordCalendar(
  token: string,
  query: LandlordCalendarQuery
): Promise<CalendarResponse> {
  return apiFetch<CalendarResponse>(
    base(),
    `/api/landlord/calendar${calendarQueryString(query)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}
