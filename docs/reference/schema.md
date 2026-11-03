# Haven Space Database Schema Documentation

## Overview

This document provides a comprehensive overview of the Haven Space database schema, which supports a boarding house platform connecting landlords with boarders. The system manages user accounts, property listings, room availability, rental applications, payments, messaging, and announcements.

---

## Core Tables

### Users Table

The `users` table serves as the central authentication and identity management table for all platform users. It stores essential user information including first name, last name, email, phone number, and hashed password credentials. The table uses a role-based system with three distinct user types: landlord, boarder, and admin, with a default role of 'boarder'. User accounts can have one of three statuses: active, inactive, or suspended, defaulting to 'active' upon creation. The table also includes an optional avatar URL field for profile pictures and timestamp fields for tracking account creation and updates. This table plays a critical role in the system by providing the foundation for authentication, authorization, and user-specific functionality across the entire platform.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `first_name` (varchar 100, NOT NULL)
- `last_name` (varchar 100, NOT NULL)
- `email` (varchar 255, NOT NULL, UNIQUE)
- `phone` (varchar 20, NOT NULL)
- `password` (varchar 255, NOT NULL)
- `role` (enum: 'landlord', 'boarder', 'admin', DEFAULT 'boarder')
- `status` (enum: 'active', 'inactive', 'suspended', DEFAULT 'active')
- `avatar_url` (varchar 500, NULL)
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

### Rooms Table

The `rooms` table manages individual room listings within properties on the Haven Space platform. It stores detailed room information including the associated property ID, an optional room number for identification, a descriptive title, comprehensive description text, pricing information with support for two decimal places, and a required deposit amount defaulting to 0.00. Each room has a capacity field indicating the maximum number of occupants (defaulting to 1) and a status field with three possible values: available, occupied, or maintenance, with 'available' as the default state. The table includes standard timestamp fields for tracking when rooms are created and last updated. This table is essential to the system as it represents the core inventory of rentable spaces, enabling landlords to list their offerings and boarders to search for and apply to suitable accommodations.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `property_id` (int, NOT NULL, FOREIGN KEY)
- `room_number` (varchar 50, NULL)
- `title` (varchar 255, NOT NULL)
- `description` (text, NOT NULL)
- `price` (decimal 10,2, NOT NULL)
- `deposit` (decimal 10,2, DEFAULT 0.00)
- `capacity` (int, DEFAULT 1)
- `status` (enum: 'available', 'occupied', 'maintenance', DEFAULT 'available')
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

### Property Table

The `property` table manages property listings owned by landlords on the Haven Space platform. It stores the landlord's user ID as a foreign key to establish ownership, along with comprehensive property details including title, description, full address, and city location. A listing's visibility is controlled by **two independent axes** (spec `edit-listing-property-info` D3): the landlord-controlled `status` and the admin-controlled `listing_moderation_status`. `status` holds the landlord's own choice with three live values — `draft` (private, never published), `available` (published), and `hidden` (unpublished) — defaulting to `available`; the legacy `occupied` value appears only in old documentation and nothing writes it. A newly created listing starts as `draft`. `listing_moderation_status` (`pending` / `pending_review` / `published` / `rejected` / `flagged`) is written only by admin moderation, never by a landlord form — except that publishing a previously _rejected_ listing requests a fresh review. A listing is boarder-visible only when `status = 'available'` **and** `listing_moderation_status = 'published'`; every public query (browse, detail, similar listings, saved listings, AI context) enforces both, so a Draft or Unpublished listing is invisible even if an admin once approved it. The table also includes a gender preference field with options for male, female, or any, defaulting to 'any' to accommodate diverse tenant preferences. Standard timestamp fields track when properties are created and last updated. This table serves as the foundation for the property management system, linking landlords to their listings and providing the organizational structure for associated rooms, enabling the platform to facilitate property discovery and rental management.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `landlord_id` (int, NOT NULL, FOREIGN KEY to users)
- `title` (varchar 255, NOT NULL)
- `description` (text, NOT NULL)
- `address` (varchar 500, NOT NULL)
- `city` (varchar 100, NOT NULL)
- `status` (TEXT, NOT NULL, DEFAULT 'available') — landlord listing status: `draft` | `available` | `hidden`
- `listing_moderation_status` (TEXT, NOT NULL, DEFAULT 'pending') — admin moderation: `pending` | `pending_review` | `published` | `rejected` | `flagged`
- `gender_pref` (enum: 'male', 'female', 'any', DEFAULT 'any')
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

### Payments Table

The `payments` table holds one row per **charge** (not per transaction) — rent, security deposit, advance payment, a utility or ad-hoc fee, or an automatically applied late fee. As shipped (spec `payments-feature`, migration `0021_payments.sql`) each row references the boarder, landlord, room, property **and the tenancy (`application_id`)** that generated it, with the amount stored as a SQLite `REAL` (rounded to centavos on write). `due_date` is a calendar date and `paid_date` is populated by the landlord's verification (or their own recording of money in hand). `status` is free text with **five** values — `pending`, `awaiting_verification`, `overdue`, `paid`, `cancelled` — and `overdue` is **derived at read time** from `due_date` plus the property's grace period rather than trusted from the column. Additional fields capture the method used, a reference number for tracking, optional notes, the billing `period_start`/`period_end`, a `generation_key` that makes schedule generation and late fees idempotent, the two reminder timestamps, and the deposit resolution recorded at move-out. Standard timestamp fields record when charge rows are created and last updated. Payment methods (GCash, bank transfer, cash) are **recorded, not processed** — there is no gateway in this feature. This table plays a crucial role in the system by providing a complete audit trail of all financial obligations, enabling landlords to track rental income and boarders to manage their payment obligations.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `boarder_id` (int, NOT NULL, FOREIGN KEY to users)
- `landlord_id` (int, NOT NULL, FOREIGN KEY to users)
- `room_id` (int, NOT NULL, FOREIGN KEY to rooms)
- `property_id` (int, NOT NULL, FOREIGN KEY to property)
- `amount` (decimal 10,2, NOT NULL)
- `due_date` (date, NOT NULL)
- `paid_date` (date, NULL)
- `status` (enum: 'pending', 'paid', 'overdue', 'cancelled', DEFAULT 'pending')
- `payment_method` (varchar 50, NOT NULL)
- `reference_number` (varchar 100, NULL) — copied from the verified submission
- `notes` (text, DEFAULT '')
- `late_fee` (real, DEFAULT 0) — flat fee added automatically after the grace period
- `application_id` (int, NULL) — the tenancy that generated the charge
- `charge_type` ('rent' | 'deposit' | 'advance' | 'utility' | 'late_fee' | 'other', DEFAULT 'rent')
- `description` (text, NULL)
- `period_start` / `period_end` (date, NULL) — the billing month the charge covers
- `generation_key` (text, NULL, UNIQUE when not null) — idempotency key for the schedule generator and late fees
- `reminder_sent_at` / `due_soon_reminded_at` (timestamp, NULL) — one overdue nudge, one "due in 3 days" nudge
- `created_by` (int, NULL) — the landlord, when the charge was posted by hand
- `deposit_resolution` ('refund' | 'forfeit' | 'partial', NULL), `deposit_resolution_amount` (real, NULL), `deposit_resolution_reason` (text, NULL)
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

#### Payment Submissions Table

The `payment_submissions` table is the audit trail for a boarder's claim that they paid: who submitted it, how much, the payment method, the **required reference number**, an optional receipt image URL, and the landlord's decision. A submission never moves money — it parks the charge in `awaiting_verification` until the landlord verifies or rejects it. A landlord recording cash in hand writes a submission that is **already `verified`**, so the boarder still sees who recorded it and when.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `payment_id` (int, NOT NULL, FOREIGN KEY to payments)
- `submitted_by` (int, NOT NULL, FOREIGN KEY to users) — the boarder, or the landlord for a recording
- `amount` (real, NOT NULL) — always derived server-side from the charge
- `payment_method` ('gcash' | 'bank_transfer' | 'cash', NOT NULL)
- `reference_number` (text, NOT NULL)
- `proof_url` (text, NULL) — optional receipt image (UploadThing)
- `notes` (text, NULL)
- `status` ('pending' | 'verified' | 'rejected', DEFAULT 'pending')
- `verified_by` (int, NULL, FOREIGN KEY to users), `verified_at` (timestamp, NULL), `rejection_reason` (text, NULL)
- `created_at` / `updated_at` (timestamp)

---

### Messaging Tables

Messaging ships as five D1 tables (migration `0020_messages.sql`, spec `messages-feature-review`) rather than the single legacy `messages` table this document used to describe — no migration ever created that one. `message_threads` holds one row per (landlord, boarder) pair, enforced by a unique index; it remembers the listing that started the conversation (`property_id`, display-only origin), who opened it (`created_by`) and a per-side soft-delete column for each participant. `thread_messages` holds the bodies (2,000-character cap enforced in the schema as well), the sender, an optional per-message property chip and `read_at` — the only unread signal in the platform. It is named `thread_messages` because migration `0011` already created an unrelated `messages` table for the write-only leave-request notice. `message_attachments` stores up to four UploadThing image URLs per message, `message_blocks` records reversible messaging-only blocks, and `message_reports` records metadata-only abuse reports (reason, status, reviewer) — admins never read bodies or images, only the fact that a report exists.

**Key Fields — `message_threads`:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `landlord_id`, `boarder_id` (int, NOT NULL, FOREIGN KEY to users) — unique together
- `property_id` (int, NULL, FOREIGN KEY to properties) — the thread's origin listing
- `created_by` (int, NOT NULL) — landlord- vs boarder-initiated
- `last_message_at` (timestamp, orders the inbox)
- `landlord_deleted_at`, `boarder_deleted_at` (timestamp, NULL) — per-side delete

**Key Fields — `thread_messages`:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `thread_id` (int, NOT NULL, FOREIGN KEY to message_threads)
- `sender_id` (int, NOT NULL, FOREIGN KEY to users)
- `body` (text, NOT NULL, DEFAULT '', CHECK length <= 2000)
- `property_id` (int, NULL) — per-message context chip
- `read_at` (timestamp, NULL) — set when the counterpart opens the thread
- `deleted_at` (timestamp, NULL)

---

### Application Table

The `application` table manages rental applications submitted by boarders for specific rooms within the Haven Space platform. It maintains comprehensive application records by storing foreign key references to the boarder, landlord, room, and property involved in each application, along with a text field containing the application message or details. The table tracks application lifecycle through a status field with five possible states: pending, accepted, rejected, cancelled, or sending, with 'pending' as the default for new applications. Standard timestamp fields record when applications are created and last updated, providing a complete audit trail of the application process. This table plays a pivotal role in the system by facilitating the rental application workflow, enabling boarders to express interest in available rooms and landlords to review, accept, or reject applications, ultimately connecting tenants with suitable accommodations.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `boarder_id` (int, NOT NULL, FOREIGN KEY to users)
- `landlord_id` (int, NOT NULL, FOREIGN KEY to users)
- `room_id` (int, NOT NULL, FOREIGN KEY to rooms)
- `property_id` (int, NOT NULL, FOREIGN KEY to property)
- `message` (text, NOT NULL)
- `status` (enum: 'pending', 'accepted', 'rejected', 'cancelled', 'sending', DEFAULT 'pending')
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

### Announcement Table

The `announcement` table enables landlords to broadcast important information and updates to their tenants within the Haven Space platform. It stores the landlord's user ID as a foreign key to identify the announcement creator, along with an optional property ID foreign key that can be NULL to support both property-specific announcements and general broadcasts to all properties. Each announcement includes a title (varchar 255), body text for the detailed message content, and a category field with four classification options: general, maintenance, urgent, or reminder, defaulting to 'general'. The table also includes a priority field with three levels: low, medium, or high, defaulting to 'medium' to help users identify the importance of each announcement. Standard timestamp fields track when announcements are created and last updated. This table serves as a critical communication tool in the system, allowing landlords to efficiently disseminate information about property maintenance, policy changes, community events, and urgent matters to their boarders, fostering transparent and timely communication within the rental community.

**Key Fields:**

- `id` (int, AUTO_INCREMENT, PRIMARY KEY)
- `landlord_id` (int, NOT NULL, FOREIGN KEY to users)
- `property_id` (int, NULL, FOREIGN KEY to property) - NULL = broadcast to all properties
- `title` (varchar 255, NOT NULL)
- `body` (text, NOT NULL)
- `category` (enum: 'general', 'maintenance', 'urgent', 'reminder', DEFAULT 'general')
- `priority` (enum: 'low', 'medium', 'high', DEFAULT 'medium')
- `created_at` (timestamp, DEFAULT current_timestamp)
- `updated_at` (timestamp, ON UPDATE current_timestamp)

---

## Relationships

### User Relationships

- **Users → Property**: One-to-Many (A landlord can own multiple properties)
- **Users → Application**: One-to-Many (A boarder can submit multiple applications; a landlord receives multiple applications)
- **Users → Payments**: One-to-Many (A boarder makes multiple payments; a landlord receives multiple payments)
- **Users → Message threads**: One-to-Many (A user takes part in many threads — one per landlord/boarder pair — and sends many messages)
- **Users → Announcement**: One-to-Many (A landlord can create multiple announcements)

### Property Relationships

- **Property → Rooms**: One-to-Many (A property contains multiple rooms)
- **Property → Application**: One-to-Many (A property can have multiple applications)
- **Property → Payments**: One-to-Many (A property generates multiple payment records)
- **Property → Announcement**: One-to-Many (A property can have multiple announcements)

### Room Relationships

- **Rooms → Application**: One-to-Many (A room can have multiple applications)
- **Rooms → Payments**: One-to-Many (A room generates multiple payment records)

### Application Relationships

- **Application → Payments**: One-to-Many (An accepted application can generate multiple payment records)

---

## Database Design Principles

1. **Normalization**: The schema follows database normalization principles to minimize data redundancy and maintain data integrity.

2. **Foreign Key Constraints**: All relationships are enforced through foreign key constraints to ensure referential integrity.

3. **Enum Types**: Status and category fields use enum types to restrict values to predefined options, ensuring data consistency.

4. **Timestamps**: All tables include `created_at` and `updated_at` (where applicable) fields for audit trails and tracking changes.

5. **Default Values**: Appropriate default values are set for status fields and other columns to ensure data consistency.

6. **Flexible Design**: The schema supports various business scenarios, such as property-specific or broadcast announcements, and multiple payment methods.

---

## Notes

- All monetary values use `decimal(10,2)` to ensure precision in financial calculations.
- The `property_id` in the `announcement` table is nullable to support both targeted and broadcast announcements.
- User roles (landlord, boarder, admin) determine access levels and available features within the platform.
- The messaging system supports bidirectional communication between any users on the platform.
- Payment tracking includes both due dates and paid dates to support overdue payment identification.
