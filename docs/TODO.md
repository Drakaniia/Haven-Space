Boarder Signup Process
Simple & Fast (Immediate Access)

Basic Registration

Email & password
Full name
Phone number (+63 format)
User type selection: "Boarder"
Terms & conditions acceptance
Email Verification

Send verification email
Allow browsing while unverified
Require verification before applying to rooms
Optional Profile Enhancement

Profile photo upload
Basic preferences (budget range, location preferences)
Emergency contact information
Immediate Platform Access

Can browse properties and rooms
Can save favorites
Can view landlord profiles
Must complete verification to submit applications
Landlord Signup Process
Multi-Step with Verification (Security-Focused)

Phase 1: Initial Registration
Account Creation

Email & password
Full name
Phone number (+63 format)
User type selection: "Landlord"
Terms & conditions acceptance
Email Verification

Send verification email
Required before proceeding
Phase 2: Identity Verification
Personal Information

Government-issued ID upload (front & back)
Selfie with ID for verification
Complete address
Date of birth
Business Information (Optional but Recommended)

Business registration documents
Tax identification number (TIN)
Business address (if different from personal)
Phase 3: Property Documentation
Property Ownership Proof
Property title/deed
Tax declaration
Barangay business permit (if applicable)
Property photos (exterior/interior)
Phase 4: Admin Review
Verification Status

Account enters "Pending Verification" state
Admin reviews submitted documents
Email notification of approval/rejection
If rejected, specific feedback provided
Account Activation

Upon approval: Full platform access
Can create property listings
Can receive and manage applications
Can access payment features
Key Differences & Rationale
Boarder Process (Streamlined)
Why Simple: Boarders are customers seeking accommodation - friction reduces conversions
Risk Level: Lower risk to platform (they're paying, not collecting money)
Verification Timing: Post-registration to maintain momentum
Access Level: Immediate browsing, delayed application submission
Landlord Process (Comprehensive)
Why Complex: Landlords handle money and provide services - higher verification needed
Risk Level: Higher risk (property fraud, fake listings, payment disputes)
Verification Timing: Pre-activation to prevent fraudulent listings
Access Level: Read-only until verified, full access post-approval
Technical Implementation Notes
Database States
-- User status progression
users.status: 'pending_email' → 'active' (boarders)
users.status: 'pending_email' → 'pending_verification' → 'active' (landlords)

-- Landlord-specific verification
landlord_profiles.verification_status: 'pending' → 'approved'/'rejected'
Middleware Behavior
Unverified Landlords: Can read but blocked from write operations
Unverified Boarders: Can browse but blocked from applications
Email Unverified: Limited access until email confirmed
Google OAuth Integration
Same verification requirements apply
OAuth users skip password step but follow same verification flow
Pre-populate available information from Google profile
This approach balances user experience with platform security, ensuring legitimate landlords while keeping boarder onboarding friction-free.

Landlord Profile

about page

boostrap
