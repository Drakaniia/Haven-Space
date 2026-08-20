import { getApiBaseUrl } from '../config';
import type { OnboardingStatusResponse, ProfileResponse, UpdateProfileInput } from '../types';
import { apiFetch } from './http';

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

export async function uploadAvatar(token: string, file: File): Promise<ProfileResponse> {
  const form = new FormData();
  form.append('avatar', file);
  const response = await fetch(`${base()}/api/users/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return (await response.json()) as ProfileResponse;
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
