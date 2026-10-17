import { getApiBaseUrl } from '../config';
import type {
  AcceptInvitationResponse,
  BoarderMutationResponse,
  BoardersResponse,
  DashboardStatsResponse,
  LandlordAnnouncementsResponse,
  LandlordApplicationsResponse,
  LandlordInvitationsResponse,
  LandlordPropertiesResponse,
  LandlordPropertyDetailResponse,
  LandlordRoomListResponse,
  LandlordVerificationDocumentUploadResponse,
  LandlordVerificationResponse,
  RoomMutationResponse,
  UploadPhotosResponse,
} from '../types';
import { ApiRequestError, apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();

export function getVerification(token: string): Promise<LandlordVerificationResponse> {
  return apiFetch<LandlordVerificationResponse>(base(), '/api/landlord/verification', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Uploads one verification slot. The file goes up as soon as the landlord picks it,
 * so a partial bundle survives a refresh; `submitVerification` marks it ready for review.
 */
export async function uploadVerificationDocument(
  token: string,
  documentType: string,
  file: File
): Promise<LandlordVerificationDocumentUploadResponse> {
  const form = new FormData();
  form.append('document_type', documentType);
  form.append('file', file);

  const response = await fetch(`${base()}/api/landlord/verification/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      String(body.error ?? body.message ?? `Upload failed (${response.status})`),
      body
    );
  }

  return body as unknown as LandlordVerificationDocumentUploadResponse;
}

export function removeVerificationDocument(
  token: string,
  documentType: string
): Promise<{ message: string; data: LandlordVerificationResponse['data'] }> {
  return apiFetch(
    base(),
    `/api/landlord/verification/documents/${encodeURIComponent(documentType)}`,
    jsonOptions(token, { method: 'DELETE' })
  );
}

export function submitVerification(token: string): Promise<{ message: string }> {
  return apiFetch(
    base(),
    '/api/landlord/verification/submit',
    jsonOptions(token, { method: 'POST' })
  );
}

export function getDashboardStats(token: string): Promise<DashboardStatsResponse> {
  return apiFetch<DashboardStatsResponse>(base(), '/api/landlord/dashboard-stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getInvitations(token: string): Promise<LandlordInvitationsResponse> {
  return apiFetch<LandlordInvitationsResponse>(base(), '/api/landlord/invitations', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function acceptInvitation(
  token: string,
  invitationId: number
): Promise<AcceptInvitationResponse> {
  return apiFetch<AcceptInvitationResponse>(
    base(),
    `/api/landlord/invitations/${invitationId}/accept`,
    jsonOptions(token, { method: 'POST' })
  );
}

export function rejectInvitation(
  token: string,
  invitationId: number
): Promise<{ message: string }> {
  return apiFetch(
    base(),
    `/api/landlord/invitations/${invitationId}/reject`,
    jsonOptions(token, { method: 'POST' })
  );
}

export function getProperties(token: string): Promise<LandlordPropertiesResponse> {
  return apiFetch<LandlordPropertiesResponse>(base(), '/api/landlord/properties', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getProperty(token: string, id: number): Promise<LandlordPropertyDetailResponse> {
  return apiFetch<LandlordPropertyDetailResponse>(
    base(),
    `/api/landlord/properties?id=${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function createListing(
  token: string,
  input: Record<string, unknown>
): Promise<{
  message: string;
  data: { id: number; title: string; status: string; room_ids: number[] };
}> {
  return apiFetch(
    base(),
    '/api/landlord/listings',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  );
}

export function updateListing(
  token: string,
  id: number,
  input: Record<string, unknown>
): Promise<{ message: string; data: { id: number } }> {
  return apiFetch(
    base(),
    `/api/landlord/listings/${id}`,
    jsonOptions(token, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  );
}

export function deleteProperty(
  token: string,
  id: number
): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
  return apiFetch(
    base(),
    `/api/landlord/properties?id=${encodeURIComponent(id)}`,
    jsonOptions(token, {
      method: 'DELETE',
    })
  );
}

export function getRooms(token: string, propertyId: number): Promise<LandlordRoomListResponse> {
  return apiFetch<LandlordRoomListResponse>(
    base(),
    `/api/landlord/rooms?propertyId=${encodeURIComponent(propertyId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function createRoom(
  token: string,
  input: Record<string, unknown>
): Promise<RoomMutationResponse> {
  return apiFetch<RoomMutationResponse>(
    base(),
    '/api/landlord/rooms',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  );
}

export function updateRoom(
  token: string,
  id: number,
  input: Record<string, unknown>
): Promise<RoomMutationResponse> {
  return apiFetch<RoomMutationResponse>(
    base(),
    `/api/landlord/rooms?id=${encodeURIComponent(id)}`,
    jsonOptions(token, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  );
}

export function deleteRoom(
  token: string,
  id: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch(
    base(),
    `/api/landlord/rooms?id=${encodeURIComponent(id)}`,
    jsonOptions(token, {
      method: 'DELETE',
    })
  );
}

export function getBoarders(token: string, propertyId: number): Promise<BoardersResponse> {
  return apiFetch<BoardersResponse>(
    base(),
    `/api/landlord/boarders?propertyId=${encodeURIComponent(propertyId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export function addBoarder(
  token: string,
  input: Record<string, unknown>
): Promise<BoarderMutationResponse> {
  return apiFetch<BoarderMutationResponse>(
    base(),
    '/api/landlord/boarders',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  );
}

export function updateBoarder(
  token: string,
  input: Record<string, unknown>
): Promise<BoarderMutationResponse> {
  return apiFetch<BoarderMutationResponse>(
    base(),
    '/api/landlord/boarders',
    jsonOptions(token, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  );
}

export function removeBoarder(token: string, id: number): Promise<BoarderMutationResponse> {
  return apiFetch<BoarderMutationResponse>(
    base(),
    `/api/landlord/boarders?id=${encodeURIComponent(id)}`,
    jsonOptions(token, { method: 'DELETE' })
  );
}

export function getApplications(token: string): Promise<LandlordApplicationsResponse> {
  return apiFetch<LandlordApplicationsResponse>(base(), '/api/landlord/applications', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function patchApplicationStatus(
  token: string,
  id: number,
  status: string
): Promise<{ success?: boolean; message?: string }> {
  return apiFetch(
    base(),
    `/api/landlord/applications/${id}/status`,
    jsonOptions(token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  );
}

export function getAnnouncements(token: string): Promise<LandlordAnnouncementsResponse> {
  return apiFetch<LandlordAnnouncementsResponse>(base(), '/api/landlord/announcements', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createAnnouncement(
  token: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; data: { announcement_id: number; message: string } }> {
  return apiFetch(
    base(),
    '/api/landlord/announcements',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  );
}

export function updateAnnouncement(
  token: string,
  id: number,
  input: Record<string, unknown>
): Promise<{ success: boolean; data: { message: string } }> {
  return apiFetch(
    base(),
    `/api/landlord/announcements/${id}`,
    jsonOptions(token, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  );
}

export function deleteAnnouncement(
  token: string,
  id: number
): Promise<{ success: boolean; data: { message: string } }> {
  return apiFetch(
    base(),
    `/api/landlord/announcements/${id}`,
    jsonOptions(token, { method: 'DELETE' })
  );
}

export function approveLeaveRequest(
  token: string,
  applicationId: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch(
    base(),
    '/api/landlord/approve-leave-request',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ application_id: applicationId }),
    })
  );
}

export function declineLeaveRequest(
  token: string,
  applicationId: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch(
    base(),
    '/api/landlord/decline-leave-request',
    jsonOptions(token, {
      method: 'POST',
      body: JSON.stringify({ application_id: applicationId }),
    })
  );
}

/**
 * Photo uploads must reject on a non-2xx response — the create-listing flow
 * depends on knowing which room's upload failed so it can name it in a toast
 * instead of reporting a false success (spec `create-listing-room-details` R8).
 */
async function parsePhotoUpload(
  response: Response,
  fallback: string
): Promise<UploadPhotosResponse> {
  const body = (await response.json().catch(() => ({}))) as UploadPhotosResponse &
    Record<string, unknown>;

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      String(body.error ?? body.message ?? `${fallback} (${response.status})`),
      body
    );
  }

  return body;
}

export async function uploadPropertyPhotos(
  token: string,
  propertyId: number,
  files: File[]
): Promise<UploadPhotosResponse> {
  const form = new FormData();
  files.forEach(file => form.append('propertyPhotos[]', file));
  const response = await fetch(`${base()}/api/landlord/listings/${propertyId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return parsePhotoUpload(response, 'Failed to upload photos');
}

export async function uploadRoomPhotos(
  token: string,
  roomId: number,
  files: File[]
): Promise<UploadPhotosResponse> {
  const form = new FormData();
  files.forEach(file => form.append('roomPhotos[]', file));
  const response = await fetch(`${base()}/api/landlord/rooms/${roomId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return parsePhotoUpload(response, 'Failed to upload photos');
}

export async function uploadTemporaryPhotos(
  token: string,
  files: File[]
): Promise<UploadPhotosResponse> {
  const form = new FormData();
  files.forEach(file => form.append('photos[]', file));
  const response = await fetch(`${base()}/api/landlord/upload-photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return (await response.json()) as UploadPhotosResponse;
}

export function setRoomPhotoCover(
  token: string,
  roomId: number,
  photoId: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch(
    base(),
    `/api/landlord/rooms/${roomId}/photos`,
    jsonOptions(token, {
      method: 'PATCH',
      body: JSON.stringify({ photo_id: photoId }),
    })
  );
}

export function deleteRoomPhoto(
  token: string,
  roomId: number,
  photoId: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch(
    base(),
    `/api/landlord/rooms/${roomId}/photos`,
    jsonOptions(token, {
      method: 'DELETE',
      body: JSON.stringify({ photo_id: photoId }),
    })
  );
}
