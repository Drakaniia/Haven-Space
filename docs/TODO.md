# TODO: Automated Boarder Onboarding System

## Feature Overview

When a boarder is first accepted into a Boarding House, implement an automated connection system that establishes communication with the landlord and provides essential onboarding materials.

## Requirements

### 1. Automated Message on Acceptance

- **Trigger**: When landlord accepts a boarder's rental application
- **Action**: Automatically create a message thread between boarder and landlord
- **Welcome Message**: Send a customizable welcome message from landlord to boarder
  - Default template: "Welcome to [Boarding House Name]! We're excited to have you join our community."
  - Landlords can customize this message in their dashboard settings

### 2. Custom Welcome Message Configuration

- **Location**: Landlord Dashboard > Settings > Welcome Messages
- **Features**:
  - Edit default welcome message text
  - Use variables: `{boarder_name}`, `{house_name}`, `{move_in_date}`, `{room_number}`
  - Preview functionality
  - Enable/disable welcome messages per property

### 3. Automated Documentation Attachment

- **Trigger**: Same as welcome message (on acceptance)
- **Attachments**: Automatically send documents to the boarder
  - House Rules PDF (mandatory)
  - Community Guidelines PDF (optional)
  - Emergency Contacts PDF (optional)
  - Custom documents uploaded by landlord

### 4. Document Management (Landlord Side)

- **Location**: Landlord Dashboard > Settings > Documents
- **Features**:
  - Upload PDF documents (max 10MB per file)
  - Mark documents as "Auto-send to new boarders"
  - Organize documents by category
  - Version control for updated documents
  - View which boarders received which documents

### 5. Document Reception (Boarder Side)

- **Location**: Boarder Dashboard > Messages > Welcome Thread
- **Features**:
  - View and download attached documents
  - Mark documents as "Read" (for house rules acknowledgment)
  - Store documents in a dedicated "My Documents" section
  - Receive notification when new documents are shared

### 6. Message Thread Creation

- **Auto-create**: Dedicated message thread titled "Welcome to [House Name]"
- **Participants**: Boarder + Landlord (or property manager)
- **Initial content**: Welcome message + attached documents
- **Thread type**: Marked as "System/Welcome" thread (cannot be deleted)

## Technical Implementation Notes

### Database Schema Updates

```sql
-- Welcome message templates
CREATE TABLE welcome_message_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    landlord_id INT NOT NULL,
    property_id INT,
    message_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Auto-send documents
CREATE TABLE auto_send_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    landlord_id INT NOT NULL,
    document_id INT NOT NULL,
    property_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Welcome message log
CREATE TABLE welcome_message_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    boarder_id INT NOT NULL,
    landlord_id INT NOT NULL,
    property_id INT NOT NULL,
    message_sent BOOLEAN DEFAULT FALSE,
    documents_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints Needed

- `POST /api/landlord/welcome-message` - Create/update welcome message
- `GET /api/landlord/welcome-message` - Get current welcome message
- `POST /api/landlord/documents/auto-send` - Toggle document auto-send
- `GET /api/landlord/documents/auto-send` - List auto-send documents
- `POST /api/boarder/documents/acknowledge` - Acknowledge document receipt

### Event Triggers

- Application status changed to "accepted" → Trigger welcome flow
- Welcome flow executes:
  1. Create message thread
  2. Send welcome message
  3. Attach configured documents
  4. Log the action
  5. Send push/email notification to boarder

## Priority

**HIGH** - This feature improves boarder onboarding experience and reduces landlord manual work

## Dependencies

- Messaging system (already exists)
- Document upload system (already exists)
- Application status management (already exists)
- Email notification system (optional enhancement)

## Future Enhancements

- Welcome message scheduling (send X days before move-in)
- Multi-language welcome messages
- Video welcome messages from landlords
- Automated first payment reminder
- Move-in checklist integration

---

# TODO: Maintenance Request System

## Feature Overview

Implement a two-sided maintenance request system where boarders can report property issues and landlords can manage, track, and resolve those requests.

## Current State

- ✅ Sidebar navigation exists for both Boarder and Landlord dashboards
- ✅ Boarder maintenance link: `../boarder/maintenance/index.html`
- ✅ Landlord maintenance link: `../landlord/maintenance/index.html`
- ❌ Actual maintenance pages not yet implemented
- ❌ No database schema for maintenance requests
- ❌ No API endpoints for maintenance operations

## Requirements

### 1. Boarder Side - Submit & Track Maintenance Requests

- **Location**: Boarder Dashboard > Maintenance
- **Features**:
  - Submit new maintenance request with:
    - Title/subject of issue
    - Description (with photo upload support)
    - Category (Plumbing, Electrical, Appliances, Furniture, Structural, Other)
    - Priority level (Low, Medium, Urgent)
    - Room/area affected
  - View list of submitted requests with status
  - Track request status: Pending → In Progress → Resolved
  - View landlord responses and updates
  - Add follow-up comments to existing requests
  - Receive notifications on status changes
  - Rate resolution satisfaction (optional)

### 2. Landlord Side - Manage & Resolve Requests

- **Location**: Landlord Dashboard > Maintenance
- **Features**:
  - View all maintenance requests from boarders
  - Filter by: Status, Property, Priority, Date
  - Sort by: Newest, Oldest, Priority, Status
  - Update request status:
    - Pending → In Progress → Resolved (or Rejected)
  - Add comments/updates to requests
  - Assign requests to maintenance staff/contractors
  - Upload photos of completed repairs
  - Track resolution time metrics
  - Bulk actions (mark multiple as resolved)
  - Archive old requests

### 3. Notification System

- **Boarder receives notification when**:
  - Request status changes
  - Landlord adds a comment
  - Request is marked as resolved
- **Landlord receives notification when**:
  - New maintenance request submitted
  - Boarder adds follow-up comment
  - Request is escalated (if urgent)

## Technical Implementation Notes

### Database Schema

```sql
-- Maintenance requests
CREATE TABLE maintenance_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    boarder_id INT NOT NULL,
    landlord_id INT NOT NULL,
    property_id INT,
    room_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('Plumbing', 'Electrical', 'Appliances', 'Furniture', 'Structural', 'Cleaning', 'Other') NOT NULL,
    priority ENUM('Low', 'Medium', 'Urgent') DEFAULT 'Medium',
    status ENUM('Pending', 'In Progress', 'Resolved', 'Rejected', 'Closed') DEFAULT 'Pending',
    images JSON, -- Array of image URLs
    assigned_to INT, -- Optional: maintenance staff/contractor ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (boarder_id) REFERENCES users(id),
    FOREIGN KEY (landlord_id) REFERENCES users(id)
);

-- Maintenance request comments/updates
CREATE TABLE maintenance_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    user_id INT NOT NULL, -- Boarder or landlord
    user_type ENUM('boarder', 'landlord', 'contractor') NOT NULL,
    comment TEXT NOT NULL,
    images JSON, -- Optional: photos of repair progress
    is_system_note BOOLEAN DEFAULT FALSE, -- For auto-generated status change notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES maintenance_requests(id)
);

-- Maintenance request attachments
CREATE TABLE maintenance_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES maintenance_requests(id)
);
```

### API Endpoints Needed

**Boarder Endpoints:**

- `POST /api/boarder/maintenance` - Create new maintenance request
- `GET /api/boarder/maintenance` - Get all maintenance requests (boarder's own)
- `GET /api/boarder/maintenance/:id` - Get specific request details
- `POST /api/boarder/maintenance/:id/comment` - Add comment to request
- `POST /api/boarder/maintenance/:id/rate` - Rate resolution (optional)

**Landlord Endpoints:**

- `GET /api/landlord/maintenance` - Get all maintenance requests (from all boarders)
- `GET /api/landlord/maintenance/:id` - Get specific request details
- `PATCH /api/landlord/maintenance/:id/status` - Update request status
- `POST /api/landlord/maintenance/:id/comment` - Add comment/update
- `POST /api/landlord/maintenance/:id/assign` - Assign to contractor
- `DELETE /api/landlord/maintenance/:id` - Delete/archive request
- `PATCH /api/landlord/maintenance/bulk-status` - Bulk status update

**Shared Endpoints:**

- `GET /api/maintenance/categories` - Get available categories
- `POST /api/maintenance/upload` - Upload image/attachment
- `GET /api/maintenance/stats` - Get maintenance statistics (for dashboard cards)

### File Structure to Create

```
client/views/boarder/maintenance/
├── index.html          # List all maintenance requests
└── create.html         # Submit new request

client/views/landlord/maintenance/
└── index.html          # Manage all maintenance requests

client/css/views/boarder/maintenance.css
client/css/views/landlord/maintenance.css

client/js/views/boarder/maintenance.js
client/js/views/landlord/maintenance.js
```

## Priority

**HIGH** - Essential feature for property management; already in sidebar navigation and dashboard stats

## Dependencies

- File upload system (for photos)
- Notification system
- Messaging system (can integrate or keep separate)
- User authentication (boarder + landlord roles)

## Future Enhancements

- Maintenance request templates (common issues pre-filled)
- Auto-assign contractors based on category
- SMS notifications for urgent requests
- Maintenance cost tracking
- Recurring maintenance scheduling
- Photo annotations (draw on images to highlight issues)
- Integration with external maintenance services
- AI-powered issue categorization from description

---

# TODO: Landlord Signup Flow with Map & Payment Setup

## Feature Overview

Redesign the landlord signup process to be a multi-step flow that captures property location via map interaction, boarding house details, and payment method information for receiving tenant payments.

## Current State

- ✅ Basic signup exists with role selection (landlord/boarder)
- ✅ Email and password collection
- ❌ No property location capture during signup
- ❌ No boarding house name input
- ❌ No payment method setup (GCash, bank, etc.)
- ❌ Single-page signup for all roles

## Requirements

### 1. Multi-Step Signup Flow for Landlords

**Step 1: Basic Account Info** (Shared with Boarders)

- Email address
- Password + Confirm password
- Full name
- Role selection: "Landlord" (pre-selected if coming from landlord CTA)

**Step 2: Property Location (Map-Based)**

- Interactive map integration (Google Maps / Mapbox / Leaflet)
- Pin drop to mark boarding house location
- Auto-fill address from pin coordinates (reverse geocoding)
- Search bar to find address manually
- Option to adjust pin for precise location
- Validate that at least one location is set before proceeding

**Step 3: Boarding House Details**

- Boarding house name (required)
- Description (optional)
- Property type: (Single unit, Multi-unit, Apartment, Dormitory)
- Number of available rooms
- Upload property photos (optional, can skip and add later)

**Step 4: Payment Method Setup**

- Select payment method type:
  - **GCash** (most common in PH)
    - GCash number input
    - Account name verification
  - **PayMaya**
    - PayMaya number input
    - Account name verification
  - **Bank Transfer**
    - Bank name (dropdown of major PH banks)
    - Account number
    - Account name
  - **Other e-wallet** (PayPal, GrabPay, etc.)
- Payment method is used to receive rent payments from boarders
- Can add/edit payment methods later in dashboard settings
- Mark one as "Primary" payment method

**Step 5: Review & Submit**

- Summary of all entered information
- Edit links to go back and change any step
- Terms & Conditions checkbox (required)
- Submit button to create account

### 2. Map Integration Requirements

- Use **Leaflet.js** (free, open-source) or **Mapbox** (if budget allows)
- Default view: Philippines (or auto-detect user location)
- Features:
  - Search box with autocomplete for addresses
  - Click on map to drop/move pin
  - Display coordinates and resolved address below map
  - Minimum zoom level to prevent overly broad selections
  - Mobile-friendly touch interactions

### 3. Payment Method Validation

- **GCash/PayMaya**: Validate Philippine mobile number format (+63 9XX XXX XXXX)
- **Bank Transfer**: Validate account number format based on selected bank
- **Verification**: Send small test amount or use API verification (if available)
- Store payment method securely (never store full account details in plain text)

### 4. Responsive Design

- Multi-step flow should work on mobile and desktop
- On mobile: Stack steps vertically with clear progress indicator
- Map should be full-width on mobile, half-width on desktop
- Payment method form should be keyboard-friendly

## Technical Implementation Notes

### Database Schema Updates

```sql
-- Extend existing users table or create landlord_profiles
CREATE TABLE landlord_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    boarding_house_name VARCHAR(255) NOT NULL,
    boarding_house_description TEXT,
    property_type ENUM('Single unit', 'Multi-unit', 'Apartment', 'Dormitory'),
    total_rooms INT DEFAULT 0,
    available_rooms INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Property locations
CREATE TABLE property_locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    landlord_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'Philippines',
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id)
);

-- Payment methods
CREATE TABLE payment_methods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    landlord_id INT NOT NULL,
    method_type ENUM('GCash', 'PayMaya', 'Bank Transfer', 'PayPal', 'GrabPay', 'Other') NOT NULL,
    account_number VARCHAR(100), -- Encrypted
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(100), -- For bank transfers only
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id)
);

-- Signup session (to store multi-step data before completion)
CREATE TABLE signup_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    role ENUM('landlord', 'boarder'),
    step_data JSON, -- Stores progressive step data
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);
```

### API Endpoints Needed

**Signup Flow:**

- `POST /api/auth/signup/landlord/step1` - Submit basic account info
- `POST /api/auth/signup/landlord/step2` - Save property location
- `POST /api/auth/signup/landlord/step3` - Save boarding house details
- `POST /api/auth/signup/landlord/step4` - Save payment method
- `POST /api/auth/signup/landlord/complete` - Finalize signup and create account
- `POST /api/auth/signup/landlord/draft` - Save progress as draft (optional)
- `GET /api/auth/signup/landlord/draft` - Retrieve saved draft

**Geocoding:**

- `GET /api/geocode/reverse?lat={lat}&lng={lng}` - Reverse geocode coordinates to address
- `GET /api/geocode/search?q={query}` - Search for address (autocomplete)

**Payment Methods:**

- `POST /api/landlord/payment-methods` - Add new payment method
- `GET /api/landlord/payment-methods` - List all payment methods
- `PATCH /api/landlord/payment-methods/:id` - Update payment method
- `DELETE /api/landlord/payment-methods/:id` - Remove payment method
- `POST /api/landlord/payment-methods/:id/set-primary` - Set as primary

### File Structure to Create

```
client/views/public/auth/
├── signup.html              # Shared signup entry point
├── signup-landlord.html     # Multi-step landlord signup flow
└── signup-boarder.html      # (Future: if boarder signup diverges)

client/css/views/public/auth/
├── signup.css               # Shared signup styles
└── signup-landlord.css      # Landlord-specific multi-step styles

client/js/views/public/auth/
├── signup.js                # Shared signup logic
└── signup-landlord.js       # Multi-step landlord signup flow

client/js/shared/
└── map-utils.js             # Map integration utilities (Leaflet/Mapbox)
```

### Frontend State Management

Use session storage or a temporary state object to persist data across steps:

```javascript
// Example state structure
const landlordSignupState = {
  step1: {
    email: '',
    password: '',
    fullName: '',
  },
  step2: {
    latitude: 14.5995,
    longitude: 120.9842,
    address: '123 Main St, Manila, Philippines',
  },
  step3: {
    boardingHouseName: '',
    description: '',
    propertyType: '',
    totalRooms: 0,
  },
  step4: {
    paymentMethod: 'GCash',
    accountNumber: '',
    accountName: '',
  },
  currentStep: 1,
};
```

### Map Integration Example (Leaflet.js)

```javascript
import L from 'leaflet';

const map = L.map('signup-map').setView([14.5995, 120.9842], 13); // Default: Manila

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
}).addTo(map);

let marker;

map.on('click', e => {
  const { lat, lng } = e.latlng;

  if (marker) {
    marker.setLatLng(e.latlng);
  } else {
    marker = L.marker(e.latlng).addTo(map);
  }

  // Update form fields
  document.getElementById('latitude').value = lat;
  document.getElementById('longitude').value = lng;

  // Reverse geocode to get address
  reverseGeocode(lat, lng);
});
```

## Priority

**HIGH** - Essential for onboarding landlords with accurate property locations and payment setup for receiving tenant payments

## Dependencies

- Map library (Leaflet.js recommended - free and open-source)
- Geocoding API (Nominatim for free reverse geocoding, or Google Maps API)
- Payment method integration (GCash API if available, or manual verification)
- Existing authentication system
- Form validation library (or custom validation)

## Security Considerations

- **Encrypt payment account numbers** at rest (use AES-256 or similar)
- **Never log or display full payment account numbers** (mask with asterisks: `**** 1234`)
- **Rate limit geocoding API** calls to prevent abuse
- **Validate map coordinates** are within expected bounds (Philippines region)
- **Sanitize all inputs** before database insertion
- **Use HTTPS** for all signup API calls

## UX Considerations

- **Progress indicator**: Show step count (e.g., "Step 2 of 4")
- **Auto-save drafts**: If user leaves midway, allow resume from last step
- **Skip options**: Allow "Add payment method later" with clear warning
- **Help text**: Explain why each piece of info is needed
- **Mobile optimization**: Ensure map is usable on small screens
- **Error handling**: Clear error messages for invalid locations, payment methods, etc.

## Future Enhancements

- **Property verification**: Send verification postcard to confirm address
- **Multiple properties**: Allow landlords to add multiple boarding houses
- **Payment method verification**: Send small test amount to verify GCash/bank account
- **Auto-fill from existing data**: If landlord has listed property on other platforms
- **Social login integration**: Google/Facebook signup with profile data pre-fill
- **Document upload**: Require business permit or DTI registration for verification
- **Referral code**: Add field for referral code during signup

---

# IMPLEMENTED: Landlord Account Verification Flow

## Feature Overview

Implement a verification workflow where new landlords see a welcome message + pending verification notification, have read-only access until admin approval, and receive a success notification once verified.

## Implementation Date

April 14, 2026

## Current State

- ✅ Database already has `is_verified` (BOOLEAN) and `account_status` fields
- ✅ Backend middleware (`authorizeVerifiedLandlord()`) already blocks write operations for unverified landlords
- ✅ Frontend permissions system (`permissions.js`) already has banner and disable-write-actions logic
- ✅ Welcome modal now mentions pending verification
- ✅ Automatic verification check/notification on dashboard load
- ✅ Auto-refresh polling every 30 seconds to detect when verified
- ✅ Success notification when verification status changes
- ✅ Backend verification status endpoint created

## Features Implemented

### 1. Welcome Modal After Signup (`signup-landlord.js`)

- Changed message from "Your account is ready" to inform about pending verification
- Visual indication that account is under review
- Updated modal text: "Your account is currently under verification. You have read-only access until a superadmin approves your account."

### 2. Enhanced Permissions System (`permissions.js`)

- Updated the pending verification banner with "Check Status" refresh button
- Implemented auto-refresh polling (every 30 seconds) to detect when verified
- Show success notification when verification status changes
- Enable write actions automatically when account becomes verified

### 3. Verification Status Check on Dashboard Load (`landlord/index.js`)

- On dashboard initialization, checks `is_verified` status via `/auth/me.php`
- If not verified, shows pending banner + applies read-only restrictions
- If already verified (after admin approval), shows success notification
- Stores last checked status to detect changes

### 4. Success Notification Component (`permissions.js`)

- Reusable notification for verification success
- Display: "🎉 Your account has been verified! You now have full access to manage your properties."
- Auto-dismiss after 10 seconds
- Remove pending banner when shown
- Re-enable all write actions

### 5. CSS Styles (`landlord.css`)

- Styled the pending verification banner (amber/yellow theme)
- Styled the success notification (green theme)
- Added animations for banner and notification appearance
- Styled disabled buttons/links with opacity and cursor changes
- Added refresh button styles with spinning animation
- Added toast notification styles for info/success/error/warning

### 6. Backend Verification Status Endpoint (`server/api/landlord/verification-status.php`)

- New endpoint: `GET /api/landlord/verification-status.php`
- Returns current verification status for authenticated user
- Used by frontend polling to detect when admin approves account
- Includes user_id, role, is_verified, account_status, and timestamps

## Files Modified

1. `client/js/views/public/auth/signup-landlord.js` - Welcome modal message
2. `client/js/shared/permissions.js` - Enhanced banner + auto-refresh + success notification
3. `client/css/views/landlord/landlord.css` - Banner & notification styles
4. `server/api/landlord/verification-status.php` - New endpoint (created)

## Testing Strategy

- [ ] Sign up as new landlord → verify welcome modal shows pending message
- [ ] Navigate dashboard → confirm read-only restrictions apply
- [ ] Manually set `is_verified=TRUE` in database → refresh dashboard → confirm success notification
- [ ] Verify write actions are enabled after verification
- [ ] Test auto-refresh polling by signing up and waiting for admin approval
- [ ] Test "Check Status" button to manually trigger verification check

## Admin Approval Mechanism

**Note**: Admin approval UI is still needed. The admin dashboard should have:

- List of pending landlord accounts awaiting verification
- Approve/Reject buttons for each pending account
- Update `is_verified` field via admin panel
- This should be added to `client/js/views/admin/admin-dashboard.js` and related admin endpoints

## Priority

**HIGH** - Essential for maintaining platform quality and preventing fraudulent landlord accounts

## Dependencies

- Existing authentication system (`/auth/me.php`)
- Database `is_verified` field on users table
- Admin dashboard for approval workflow (future)
- Email notification system for status updates (future)

## Future Enhancements

- Email notification when account is verified
- Email notification when account is rejected with reason
- Admin dashboard UI for approving/rejecting landlord accounts
- Automatic rejection after X days if not reviewed
- SMS notification for verification status
- Document upload for verification (business permit, DTI registration)
- Re-verification flow for suspended accounts

---

# TODO: Conditional Boarder Routing After Login/Signup

## Feature Overview

Implement conditional routing logic for boarders after login/signup based on their application status. Currently, all boarders are redirected to the dashboard which assumes they already have a room, creating a poor UX for new users who haven't found boarding houses yet.

## Current State

- ✅ Boarder login redirects to `/views/boarder/index.html` after successful login
- ✅ Boarder signup redirects to login page, then to dashboard
- ✅ "Find a Room" page exists at `/views/public/find-a-room.html`
- ❌ No status checking before redirect
- ❌ New boarders see dashboard with room-specific data (lease, payments, utilities) they don't have
- ❌ No intermediate onboarding state

## Problem

The current boarder dashboard assumes the user:

- Already has an accepted room
- Has active lease agreements
- Has payment history and utility bills
- Has room announcements

This creates confusion for:

1. **New boarders** who just signed up but haven't browsed properties
2. **Boarders with pending applications** waiting for landlord approval
3. **Boarders whose applications were rejected** and need to find new rooms

## Requirements

### 1. Application Status Tracking

Add a field to track boarder onboarding state:

```sql
ALTER TABLE users ADD COLUMN boarder_status ENUM(
  'new',              -- Just signed up, no applications
  'browsing',         -- Actively looking at properties
  'applied_pending',  -- Has pending application(s)
  'accepted',         -- Application accepted, has room
  'rejected'          -- Last application was rejected
) DEFAULT 'new';
```

### 2. Conditional Login Redirect Logic

After successful boarder login, check status and redirect:

```javascript
// Pseudocode for login.js
if (result.user.role === 'boarder') {
  const boarderStatus = result.user.boarder_status || 'new';

  switch (boarderStatus) {
    case 'new':
    case 'browsing':
      // New user - send to find a room page
      window.location.href = `${basePath}public/find-a-room.html`;
      break;

    case 'applied_pending':
      // Has pending applications - show dashboard with application status
      window.location.href = `${basePath}boarder/applications/index.html`;
      break;

    case 'accepted':
      // Has room - show full dashboard
      window.location.href = `${basePath}boarder/index.html`;
      break;

    case 'rejected':
      // Application rejected - show dashboard with "Find New Room" prompt
      window.location.href = `${basePath}boarder/index.html?status=rejected`;
      break;
  }
}
```

### 3. Dashboard States Based on Status

#### State 1: New Boarder (No Applications)

**Redirect to**: `/views/public/find-a-room.html`

**Features**:

- Full property browsing experience
- Map view integration
- Saved searches and favorites
- Encouraging messaging: "Find your perfect room"

#### State 2: Pending Application

**Redirect to**: `/views/boarder/applications/index.html`

**Dashboard Modifications**:

- Show prominent banner: "Your application to [Boarding House] is pending review"
- Display application details (submitted date, expected response time)
- Quick access to "Continue Browsing" if they want to apply to multiple places
- Estimated timeline for landlord response
- Cancel application option

**UI Elements**:

```html
<!-- Pending Application Banner -->
<div class="boarder-status-banner">
  <div class="boarder-status-icon pending">
    <span data-icon="clock" data-icon-width="32" data-icon-height="32"></span>
  </div>
  <div class="boarder-status-content">
    <h3>Application Pending Review</h3>
    <p>You applied to <strong>Sunrise Dormitory</strong> on Jan 15, 2025</p>
    <p class="boarder-status-timeline">Expected response: Within 3-5 business days</p>
  </div>
  <div class="boarder-status-actions">
    <a href="./applications/index.html" class="btn btn-outline">View Application</a>
    <a href="../../public/find-a-room.html" class="btn btn-secondary">Continue Browsing</a>
  </div>
</div>
```

#### State 3: Accepted (Has Room)

**Redirect to**: `/views/boarder/index.html` (current dashboard)

**Current dashboard shows**:

- Lease details and room info
- Payment history and outstanding balance
- Utility consumption tracking
- Room announcements
- Quick actions (maintenance, guest pass, etc.)

#### State 4: Application Rejected

**Redirect to**: `/views/boarder/index.html?status=rejected`

**Dashboard Modifications**:

- Show rejection banner with empathy messaging
- Provide reason for rejection (if available from landlord)
- Strong CTA to "Find Available Rooms"
- Keep messaging/support resources visible

**UI Elements**:

```html
<!-- Rejection Banner -->
<div class="boarder-status-banner rejected">
  <div class="boarder-status-icon rejected">
    <span data-icon="xMark" data-icon-width="32" data-icon-height="32"></span>
  </div>
  <div class="boarder-status-content">
    <h3>Application Not Accepted</h3>
    <p>Your application to Sunrise Dormitory was not accepted.</p>
    <p class="boarder-status-reason" id="rejectionReason">Reason: Room already filled</p>
  </div>
  <div class="boarder-status-actions">
    <a href="../../public/find-a-room.html" class="btn btn-primary">
      <span data-icon="search" data-icon-width="20" data-icon-height="20"></span>
      Find Available Rooms
    </a>
  </div>
</div>
```

### 4. Application Status Updates

**Trigger Points**:

1. **Boarder applies to property**:

   ```javascript
   // Update status when application submitted
   boarder_status = 'applied_pending';
   ```

2. **Landlord accepts application**:

   ```javascript
   // Update status when accepted
   boarder_status = 'accepted';
   // Also triggers welcome message system (see TODO: Automated Boarder Onboarding)
   ```

3. **Landlord rejects application**:

   ```javascript
   // Update status and store rejection reason
   boarder_status = 'rejected';
   rejection_reason = 'Room already filled'; // Optional
   ```

4. **Boarder cancels application**:
   ```javascript
   // Check if they have other pending applications
   if (no_other_pending_applications) {
     boarder_status = 'browsing';
   }
   ```

### 5. API Endpoints Needed

- `GET /api/boarder/status` - Get current boarder application status
- `GET /api/boarder/applications` - List all applications with status
- `POST /api/boarder/applications` - Submit new application (triggers status update)
- `PATCH /api/boarder/applications/:id/cancel` - Cancel application
- `PATCH /api/landlord/applications/:id/status` - Update application status (accept/reject)

### 6. File Structure Changes

```
client/js/shared/
└── routing.js              # Centralized routing logic for authenticated users

client/css/components/
└── status-banner.css       # Reusable status banner component styles

client/views/boarder/
└── index.html              # Modify to support conditional banners
```

### 7. Routing Logic Implementation

Create centralized routing helper:

```javascript
// client/js/shared/routing.js
export function getBoarderRedirectPath(user) {
  const basePath = getBasePath();

  if (!user.boarderStatus || user.boarderStatus === 'new') {
    return `${basePath}public/find-a-room.html`;
  }

  if (user.boarderStatus === 'applied_pending') {
    return `${basePath}boarder/applications/index.html`;
  }

  // Default to dashboard for accepted/rejected
  return `${basePath}boarder/index.html`;
}

export function getBasePath() {
  const pathname = window.location.pathname;

  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/';
  }

  return '/views/';
}
```

## Technical Implementation Notes

### Database Schema Updates

```sql
-- Add boarder status tracking
ALTER TABLE users ADD COLUMN boarder_status ENUM(
  'new',
  'browsing',
  'applied_pending',
  'accepted',
  'rejected'
) DEFAULT 'new';

-- Add rejection reason (nullable)
ALTER TABLE users ADD COLUMN last_rejection_reason TEXT NULL;

-- Add index for faster status queries
CREATE INDEX idx_boarder_status ON users(role, boarder_status) WHERE role = 'boarder';
```

### Login Flow Update

```javascript
// In login.js after successful authentication
if (result.user.role === 'boarder') {
  // Fetch current application status
  const statusResponse = await fetch(`${CONFIG.API_BASE_URL}/boarder/status`, {
    credentials: 'include',
  });

  const statusData = await statusResponse.json();

  // Store status with user data
  const userData = {
    ...result.user,
    boarderStatus: statusData.status,
  };
  localStorage.setItem('user', JSON.stringify(userData));

  // Redirect based on status
  const redirectPath = getBoarderRedirectPath(userData);
  window.location.href = redirectPath;
}
```

### Signup Flow Update

```javascript
// In signup.js after successful registration
if (response.ok && selectedRole === 'boarder') {
  // New boarders always start with 'new' status
  // Redirect to find-a-room page, NOT login
  window.location.href = `${basePath}public/find-a-room.html`;
}
```

## Priority

**CRITICAL** - This is a fundamental UX issue that affects all new boarders. Current implementation shows confusing dashboard data to users who don't have rooms yet.

## Dependencies

- Application management system (exists in sidebar but pages not implemented)
- User authentication system
- Database schema for application tracking
- Status banner UI component

## Related TODOs

- See "TODO: Automated Boarder Onboarding System" - this routing logic should trigger the welcome flow when status changes to 'accepted'
- See "TODO: Maintenance Request System" - boarders can only submit maintenance requests when status is 'accepted'

## Future Enhancements

- **Multiple applications tracking**: Allow boarders to track multiple pending applications
- **Application timeline**: Show visual timeline of application progress
- **Smart recommendations**: Suggest similar properties if application rejected
- **Notification system**: Push/email notifications for application status changes
- **Onboarding checklist**: Show steps to complete before first application (profile, preferences, etc.)
- **Trial period tracking**: For accepted boarders, show trial period countdown
- **Roommate matching**: Suggest compatible roommates for shared accommodations

---

-We need to add in the boarder dashboard about Ask of leave, where the boarder can send a leave with writing a note or letter if the leave is sudden or forgot to talk to the landlord

-In the landlord dashbaord there are rooms and to check if the boarder is still onboard the name will be bold, but if the boarder Leave(Ask of Leave - feature in the boarder dashboard where they can leave the baorder), their name will be turn gray or transparent gray. After that the landlord then can update(share information and details of the boarding house) availability of the rooms so that another tenant can apply for it.
