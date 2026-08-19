-- workers/api/migrations/0015_onboarding_fields.sql
ALTER TABLE boarder_profiles ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE boarder_profiles ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE boarder_profiles ADD COLUMN search_preferences TEXT;

ALTER TABLE landlord_profiles ADD COLUMN business_bio TEXT;
ALTER TABLE landlord_profiles ADD COLUMN contact_number TEXT;
ALTER TABLE landlord_profiles ADD COLUMN avatar_url TEXT;
ALTER TABLE landlord_profiles ADD COLUMN stripe_connect_id TEXT;
ALTER TABLE landlord_profiles ADD COLUMN verification_status TEXT DEFAULT 'pending';
