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
