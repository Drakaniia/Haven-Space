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
  RoomMutationResponse,
  UploadPhotosResponse,
} from '../types';
import { apiFetch, jsonOptions } from './http';

const base = () => getApiBaseUrl();

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
  return (await response.json()) as UploadPhotosResponse;
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
  return (await response.json()) as UploadPhotosResponse;
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
