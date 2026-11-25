import { getApiBaseUrl } from '../config';
import type {
  ApiErrorBody,
  NotificationPreferences,
  NotificationPreferencesResponse,
  OnboardingStatusResponse,
  ProfileResponse,
  UpdateProfileInput,
} from '../types';
import { apiFetch, ApiRequestError } from './http';

const base = () => getApiBaseUrl();

export function getProfile(token: string): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>(base(), '/api/users/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateProfile(token: string, input: UpdateProfileInput): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>(base(), '/api/users/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export async function uploadAvatar(
  token: string,
  file: File
): Promise<ProfileResponse & { avatar_url?: string }> {
  const form = new FormData();
  form.append('avatar', file);
  const response = await fetch(`${base()}/api/users/avatar`, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = (await response.json().catch(() => ({}))) as ProfileResponse & {
    avatar_url?: string;
  } & ApiErrorBody;
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      body.error ?? body.message ?? `Request failed (${response.status})`,
      body
    );
  }
  return body;
}

export function getNotificationPreferences(
  token: string
): Promise<NotificationPreferencesResponse> {
  return apiFetch<NotificationPreferencesResponse>(base(), '/api/users/notification-preferences', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateNotificationPreferences(
  token: string,
  preferences: NotificationPreferences
): Promise<NotificationPreferencesResponse> {
  return apiFetch<NotificationPreferencesResponse>(base(), '/api/users/notification-preferences', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(preferences),
  });
}

export function getOnboardingStatus(token: string): Promise<OnboardingStatusResponse> {
  return apiFetch<OnboardingStatusResponse>(base(), '/api/boarder/onboarding-status', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateOnboarding(
  token: string,
  input: Record<string, unknown>
): Promise<OnboardingStatusResponse> {
  return apiFetch<OnboardingStatusResponse>(base(), '/api/boarder/update-onboarding', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export function updateOnboardingData(
  token: string,
  role: 'boarder' | 'landlord',
  step: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  const path =
    role === 'landlord'
      ? '/api/landlord/update-onboarding-data'
      : '/api/boarder/update-onboarding-data';
  return apiFetch(base(), path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ step, data }),
  });
}
