import { getApiBaseUrl } from '../config';
import type {
  AcceptedApplicationsResponse,
  ApplicationDetailResponse,
  ApplicationsResponse,
  BoarderAnnouncementsResponse,
  CreateApplicationInput,
  LeaveRequestInput,
  SaveListingResponse,
  SavedListingsResponse,
  SavedStatusResponse,
  TenancyResponse,
} from '../types';
import { apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();

export function getSavedListings(token: string): Promise<SavedListingsResponse> {
  return apiFetch<SavedListingsResponse>(base(), '/api/boarder/saved-listings', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getSavedStatus(token: string, propertyId: number): Promise<SavedStatusResponse> {
  return apiFetch<SavedStatusResponse>(
    base(),
    `/api/boarder/saved-listings?property_id=${encodeURIComponent(propertyId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function saveListing(
  token: string,
  propertyId: number,
  roomId?: number
): Promise<SaveListingResponse> {
  return apiFetch<SaveListingResponse>(
    base(),
    '/api/boarder/saved-listings',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ property_id: propertyId, room_id: roomId ?? null }),
    })
  );
}

export function unsaveListing(
  token: string,
  propertyId: number
): Promise<{ success: true; message: string }> {
  return apiFetch(
    base(),
    '/api/boarder/saved-listings',
    jsonOptions(token, {
      method: 'DELETE',
      body: JSON.stringify({ property_id: propertyId }),
    })
  );
}

export function getApplications(token: string): Promise<ApplicationsResponse> {
  return apiFetch<ApplicationsResponse>(base(), '/api/boarder/applications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getApplication(token: string, id: number): Promise<ApplicationDetailResponse> {
  return apiFetch<ApplicationDetailResponse>(base(), `/api/boarder/applications/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createApplication(
  token: string,
  input: CreateApplicationInput
): Promise<ApplicationDetailResponse> {
  return apiFetch<ApplicationDetailResponse>(
    base(),
    '/api/boarder/applications',
    jsonOptions(token, { method: 'POST', body: JSON.stringify(input) })
  );
}

export function deleteApplication(token: string, id: number): Promise<{ message: string }> {
  return apiFetch(
    base(),
    `/api/boarder/applications/${id}`,
    jsonOptions(token, { method: 'DELETE' })
  );
}

export function confirmApplication(
  token: string,
  id: number,
  paymentMethod: string
): Promise<ApplicationDetailResponse> {
  return apiFetch<ApplicationDetailResponse>(
    base(),
    `/api/boarder/applications/${id}/confirm`,
    jsonOptions(token, { method: 'POST', body: JSON.stringify({ payment_method: paymentMethod }) })
  );
}

export function getTenancy(token: string): Promise<TenancyResponse> {
  return apiFetch<TenancyResponse>(base(), '/api/boarder/tenancy', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function leaveRequest(
  token: string,
  input: LeaveRequestInput
): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
  return apiFetch(
    base(),
    '/api/boarder/leave-request',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  );
}

/** End an approved leave on the tenant's request (spec `leave-now`). */
export function leaveNow(
  token: string,
  applicationId: number
): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
  return apiFetch(
    base(),
    '/api/boarder/leave-now',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ application_id: applicationId }),
    })
  );
}

export function getBoarderAnnouncements(token: string): Promise<BoarderAnnouncementsResponse> {
  return apiFetch<BoarderAnnouncementsResponse>(base(), '/api/boarder/announcements', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function viewAnnouncement(token: string, id: number): Promise<{ success: boolean }> {
  return apiFetch(
    base(),
    `/api/boarder/announcements/${id}/view`,
    jsonOptions(token, { method: 'POST' })
  );
}

export function getAcceptedApplications(token: string): Promise<AcceptedApplicationsResponse> {
  return apiFetch<AcceptedApplicationsResponse>(base(), '/api/boarder/accepted-applications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
