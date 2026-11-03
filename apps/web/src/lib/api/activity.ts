import { getApiBaseUrl } from '../config';
import type { ActivityResponse } from '../types';
import { apiFetch } from './http';

const base = () => getApiBaseUrl();

export interface LandlordActivityQuery {
  /** Inclusive, `YYYY-MM-DD`. Omitted means the API's trailing 30-day default. */
  from?: string;
  /** Exclusive, `YYYY-MM-DD`. */
  to?: string;
  propertyId?: number | null;
  /** Event types and/or families (`money`, `applications`, `tenancy`, `content`). */
  types?: string[] | null;
  limit?: number;
  offset?: number;
}

/** Query string for one activity window (spec §8.6). */
export function activityQueryString(query: LandlordActivityQuery): string {
  const params = new URLSearchParams();

  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.propertyId) params.set('propertyId', String(query.propertyId));
  if (query.types && query.types.length > 0) params.set('types', query.types.join(','));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));

  return params.toString() ? `?${params.toString()}` : '';
}

export function getLandlordActivity(
  token: string,
  query: LandlordActivityQuery = {}
): Promise<ActivityResponse> {
  return apiFetch<ActivityResponse>(base(), `/api/landlord/activity${activityQueryString(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
