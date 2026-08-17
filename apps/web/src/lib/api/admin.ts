import { getApiBaseUrl } from '../config';
import type {
  AdminApplicationsResponse,
  AdminLandlordsResponse,
  AdminPropertiesResponse,
  AdminPropertyAccessResponse,
  AdminSettingsResponse,
  AdminSummaryResponse,
  AdminUsersResponse,
  LandlordCreatedDataResponse,
  PropertyAccessHistoryResponse,
} from '../types';
import { apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();

export function getSummary(token: string): Promise<AdminSummaryResponse> {
  return apiFetch<AdminSummaryResponse>(base(), '/api/admin/summary', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getUsers(token: string): Promise<AdminUsersResponse> {
  return apiFetch<AdminUsersResponse>(base(), '/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function patchUserStatus(
  token: string,
  userId: number,
  accountStatus: string
): Promise<{ message: string }> {
  return apiFetch(
    base(),
    '/api/admin/users',
    jsonOptions(token, {
      method: 'PATCH',
      body: JSON.stringify({ userId, account_status: accountStatus }),
    })
  );
}

export function getProperties(token: string): Promise<AdminPropertiesResponse> {
  return apiFetch<AdminPropertiesResponse>(base(), '/api/admin/properties?moderation=all', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function patchPropertyStatus(
  token: string,
  propertyId: number,
  action: string
): Promise<{ message: string }> {
  return apiFetch(
    base(),
    '/api/admin/properties',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ propertyId, action }),
    })
  );
}

export function getApplications(token: string): Promise<AdminApplicationsResponse> {
  return apiFetch<AdminApplicationsResponse>(base(), '/api/admin/applications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getSettings(token: string): Promise<AdminSettingsResponse> {
  return apiFetch<AdminSettingsResponse>(base(), '/api/admin/settings', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function patchSettings(
  token: string,
  settings: Record<string, string>
): Promise<{ message: string }> {
  return apiFetch(
    base(),
    '/api/admin/settings',
    jsonOptions(token, {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    })
  );
}

export function getLandlords(token: string): Promise<AdminLandlordsResponse> {
  return apiFetch<AdminLandlordsResponse>(base(), '/api/admin/landlords', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateLandlordVerification(
  token: string,
  landlordId: number,
  action: 'approve' | 'reject'
): Promise<{ message: string }> {
  return apiFetch(
    base(),
    '/api/admin/landlords',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ landlordId, action }),
    })
  );
}

export function getVerifiedLandlords(token: string): Promise<AdminLandlordsResponse> {
  return apiFetch<AdminLandlordsResponse>(base(), '/api/admin/landlords?status=verified', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getPropertyAccess(token: string): Promise<AdminPropertyAccessResponse> {
  return apiFetch<AdminPropertyAccessResponse>(base(), '/api/admin/property-access', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function sendPropertyAccessInvitation(
  token: string,
  input: { landlordId: number; propertyId: number }
): Promise<{ message: string; data: { invitation: Record<string, unknown> } }> {
  return apiFetch(
    base(),
    '/api/admin/property-access/invitations',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  );
}

export function revokePropertyAccessInvitation(
  token: string,
  invitationId: number
): Promise<{ message: string }> {
  return apiFetch(
    base(),
    `/api/admin/property-access/invitations/${invitationId}/revoke`,
    jsonOptions(token, { method: 'POST' })
  );
}

export function removePropertyAccess(
  token: string,
  input: { propertyId: number; landlordId: number }
): Promise<{ message: string; data: { property_id: number; landlord_id: number } }> {
  return apiFetch(
    base(),
    '/api/admin/property-access/remove',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  );
}

export function getPropertyAccessHistory(token: string): Promise<PropertyAccessHistoryResponse> {
  return apiFetch<PropertyAccessHistoryResponse>(base(), '/api/admin/property-access/history', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getLandlordCreatedData(
  token: string,
  propertyId: number,
  landlordId: number
): Promise<LandlordCreatedDataResponse> {
  return apiFetch<LandlordCreatedDataResponse>(
    base(),
    `/api/admin/property-access/${propertyId}/landlord-data?landlordId=${encodeURIComponent(
      landlordId
    )}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}
