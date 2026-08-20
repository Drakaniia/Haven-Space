export interface PropertyInvitationRow {
  id: number;
  property_id: number;
  invitee_id: number;
  invited_by: number;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  accepted_at: string | null;
  rejected_at: string | null;
  revoked_at: string | null;
  revoked_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PropertyAccessRow {
  id: number;
  property_id: number;
  landlord_id: number;
  granted_by: number;
  invitation_id: number | null;
  granted_at: string;
  removed_at: string | null;
  removed_by: number | null;
}

export interface InviteeLandlordRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_verified: number;
  account_status: string;
}

export interface PropertyForAccessRow {
  id: number;
  title: string;
  landlord_id: number;
}

export interface InvitationListItemRow {
  id: number;
  property_id: number;
  property_name: string;
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  revoked_at: string | null;
}

export interface PendingInvitationRow {
  id: number;
  invitee_id: number;
  invitee_first_name: string;
  invitee_last_name: string;
  invitee_email: string;
  invited_by: number;
  created_at: string;
}

export interface AuthorizedLandlordRow {
  id: number;
  landlord_id: number;
  first_name: string;
  last_name: string;
  email: string;
  granted_by: number;
  granted_at: string;
}

export interface PropertyAccessOverviewRow {
  property_id: number;
  property_title: string;
  owner_id: number;
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
}

export interface LandlordCreatedDataCounts {
  rooms: number;
  tenants: number;
  payments: number;
  announcements: number;
}

export type AccessHistoryEventType =
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_rejected'
  | 'invitation_revoked'
  | 'access_granted'
  | 'access_removed';

export interface AccessHistoryEvent {
  type: AccessHistoryEventType;
  invitation_id: number | null;
  access_id: number | null;
  property_id: number;
  landlord_id: number;
  actor_id: number | null;
  at: string;
}

export interface CreatePropertyInvitationInput {
  propertyId: number;
  inviteeId: number;
  invitedBy: number;
}

export interface GrantPropertyAccessInput {
  propertyId: number;
  landlordId: number;
  grantedBy: number;
  invitationId: number | null;
}

// SQL fragment that is true when the current properties row is accessible to a
// landlord: the landlord owns the property (`landlord_id`) OR has an active
// shared-access row in `property_access`. Pass `alias` (e.g. `'p'`) when the
// properties table is aliased in the query and column references would
// otherwise be ambiguous. Consumes two `?` binds — both bound to the landlord id.
