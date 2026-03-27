# Haven Space - Product Alignment Plan

## Problem Statement

**Current Issue:** The landlord and boarder dashboards focus primarily on listing/reserving boarding houses, but don't adequately solve the **actual problems** identified in the project pitch.

---

## Core Problems

### Student/Boarder Problems

1. **Physically exhausting search process** - Students walk from one boarding house to another in the heat
2. **Time-consuming** - Hours wasted searching for vacancies
3. **Incomplete/inaccurate information** - Listings lack key details (price, location, rules, wifi, policies)
4. **Difficulty comparing options** - No centralized way to evaluate multiple properties
5. **No secure payment system** - Trust issues and financial risk
6. **Poor communication** - Relies on disconnected channels (SMS, phone, social media)

### Landlord Problems

1. **Manual record keeping** - Paper forms, handwriting, prone to errors and loss
2. **Difficulty reaching tenants** - No centralized marketplace
3. **Manual tenant screening** - No systematic background checking
4. **Cash flow tracking challenges** - Manual rent collection, receipt writing
5. **No standardized processes** - Booking processes vary wildly
6. **Communication fragmentation** - Group chats, phone calls, SMS for reminders

---

## Current Dashboard Gaps

### What We Built vs. What's Needed

| Current Feature      | Problem It Solves      | Missing/Critical Features                                        |
| -------------------- | ---------------------- | ---------------------------------------------------------------- |
| Property listings    | ✓ Centralized browsing | ✗ Detailed filtering (price, location, amenities)                |
| Basic stats          | ✗ Surface-level info   | ✗ Actionable insights (occupancy trends, revenue analytics)      |
| Application tracking | ✓ Digital process      | ✗ Automated screening, background checks                         |
| Payment display      | ✗ Read-only            | ✗ **Online payment processing**, payment history, auto-reminders |
| Maintenance requests | ✓ Digital submission   | ✗ Priority tracking, vendor assignment, status updates           |
| Messages             | ✓ Basic communication  | ✗ Structured communication (announcements, automated reminders)  |

---

## Recommended Pivot Strategy

### Phase 1: Critical Problem Solvers (High Priority)

#### For Boarders

1. **Advanced Search & Filtering**

   - Filter by: price range, distance from university, amenities (WiFi, AC, kitchen)
   - **Interactive Map View** (Google Maps-inspired)
     - See all available boarding houses pinned on map
     - Distance calculator from current location/university
     - Cluster markers for dense areas
     - Custom map pins with property preview cards on hover
     - Draw radius to search within specific distance
     - Street view integration for neighborhood exploration
     - Traffic layer to assess commute times
     - Save favorite locations on map
   - Virtual tours (photo galleries, floor plans)
   - Comparison tool (side-by-side property comparison)

2. **Transparent Information Display**

   - Complete house rules displayed upfront
   - Utility cost breakdown
   - Landlord verification badge
   - Reviews/ratings from previous boarders

3. **Secure Payment System**

   - Online payment integration (GCash, PayMaya, bank transfer)
   - Automatic receipt generation
   - Payment schedule calendar
   - Auto-reminders for due dates

4. **Digital Application Process**
   - Standardized application form
   - Document upload (ID, proof of enrollment)
   - Application status tracking
   - Background check consent

#### For Landlords

1. **Automated Rent Collection**

   - Recurring payment setup
   - Automatic late fee calculation
   - Digital receipt generation
   - Payment reconciliation dashboard
   - **Payment Status Indicators** (Traffic Light System)
     - 🟢 **Green Status** - Payment deadline is 30+ days away (e.g., month away pa)
       - Visual indicator: Green badge/icon on payment dashboard
       - No action needed, normal status
     - 🟡 **Yellow Status** (Warning) - Payment due date is near (7-14 days before due date)
       - Visual indicator: Yellow/orange badge with warning icon
       - **Auto-trigger email notification** to boarder with payment reminder
       - Appears in "Upcoming Payments" section with highlighted status
       - Optional SMS notification
     - 🔴 **Red Status** (Overdue) - Payment is late (past due date)
       - Visual indicator: Red badge with alert icon
       - **Auto-trigger email notification** to boarder with overdue notice
       - Automatic late fee calculation applied
       - Appears in "Overdue Payments" section at top of dashboard
       - Escalation notifications (SMS, in-app alert)
       - Track days overdue

2. **Tenant Screening System**

   - Application review workflow
   - Reference check templates
   - Approval/rejection workflows
   - Tenant history tracking

3. **Financial Management**

   - Revenue tracking by property
   - Expense tracking (maintenance, utilities)
   - Financial reports (monthly, quarterly)
   - Tax document generation

4. **Communication Hub**

   - Bulk announcements to all boarders
   - Automated payment reminders
   - Maintenance update notifications
   - Meeting scheduler

5. **Property Location Management** (Google Maps-inspired)
   - **Auto-detect location** - Use device GPS to pin property location automatically
   - **Custom pin placement** - Manually adjust pin on interactive map for accuracy
   - **Property boundary drawing** - Draw property lines on map for clear boundaries
   - **Location verification badge** - Verified location increases trust
   - **Nearby landmarks** - Tag nearby universities, transport, shopping for visibility
   - **Catchment area analysis** - Show recommended boarding house radius based on demand
   - **Street view integration** - Add street-level photos of property exterior

### Phase 2: Operational Efficiency (Medium Priority)

#### For Boarders

1. **Digital Contract Signing**

   - E-signature integration
   - Contract template library
   - Document storage

2. **Roommate Matching**

   - Compatibility questionnaire
   - Roommate search filters
   - Introduction messaging

3. **Community Features**
   - Boarder forum/discussion boards
   - Local area recommendations
   - Event announcements

#### For Landlords

1. **Maintenance Management**

   - Vendor directory
   - Maintenance scheduling
   - Cost tracking per property
   - Preventive maintenance reminders

2. **Occupancy Optimization**

   - Vacancy alerts
   - Dynamic pricing suggestions
   - Lease renewal tracking
   - Move-in/move-out checklists

3. **Document Management**
   - Digital file storage
   - Contract templates
   - Automated backup

### Phase 3: Advanced Features (Low Priority)

#### For Both

1. **Mobile App**

   - Push notifications
   - Offline mode
   - Mobile payment

2. **Analytics Dashboard**

   - Market trends
   - Pricing benchmarks
   - Occupancy rates by area

3. **Integration**
   - University student portal
   - Utility payment integration
   - Insurance partnerships

---

## Immediate Action Items

### 1. Dashboard Redesign (Sprint 1-2)

#### Boarder Dashboard Changes

- [ ] Replace generic stats with **personalized metrics** (applications sent, payment status, lease countdown)
- [ ] Add **search bar** prominently in top navigation
- [ ] Create **saved searches** with alert notifications
- [ ] Add **payment center** with online payment capability
- [ ] Implement **application tracker** with status timeline
- [ ] Add **document vault** for contracts and receipts

#### Landlord Dashboard Changes

- [ ] Replace generic stats with **business metrics** (occupancy rate, revenue vs. expenses, upcoming renewals)
- [ ] Add **quick actions** (create listing, send reminder, record payment)
- [ ] Implement **payment dashboard** with online reconciliation
- [ ] Create **application review queue** with approve/reject workflow
- [ ] Add **announcement composer** for bulk messaging
- [ ] Implement **financial reports** section

### 2. Backend Requirements (Sprint 1-3)

- [ ] Payment gateway integration (GCash, PayMaya APIs)
- [ ] Email/SMS notification system
  - [ ] Email service integration (SendGrid, Mailgun, or AWS SES)
  - [ ] SMS service integration (Twilio or local Philippines provider)
  - [ ] **Automated payment reminder triggers**
    - [ ] Yellow status reminder (7-14 days before due date)
    - [ ] Red status overdue notice (immediate when past due)
    - [ ] Escalation reminders (3 days, 7 days, 14 days overdue)
  - [ ] Email template system for payment notifications
  - [ ] Configurable notification schedules
- [ ] Document storage (AWS S3 or equivalent)
- [ ] E-signature integration (DocuSign or HelloSign API)
- [ ] Background check API (if available in Philippines)
- [ ] **Map integration (Google Maps API / Leaflet / Mapbox)**
  - [ ] Geocoding service for address-to-coordinates conversion
  - [ ] Geolocation API for auto-detecting user location
  - [ ] Map tiles and rendering
  - [ ] Distance calculation service
  - [ ] Places API for nearby landmarks (universities, transport, shopping)
  - [ ] Street View API integration

### 3. Data Model Updates (Sprint 1)

- [ ] Add `amenities` table (WiFi, AC, parking, kitchen, laundry)
- [ ] Add `reviews` table (landlord ratings, property ratings)
- [ ] Add `payment_transactions` table (online payments)
- [ ] Add `applications` table with status workflow
- [ ] Add `announcements` table (landlord to boarder)
- [ ] Add `documents` table (contracts, receipts, IDs)
- [ ] Add `maintenance_tickets` table with vendor assignment
- [ ] **Add `property_locations` table**
  - [ ] `property_id` (FK to properties)
  - [ ] `latitude` (decimal)
  - [ ] `longitude` (decimal)
  - [ ] `accuracy` (GPS accuracy in meters)
  - [ ] `verified` (boolean - location verified by admin)
  - [ ] `property_boundaries` (JSON polygon coordinates)
  - [ ] `nearby_landmarks` (JSON array of nearby places)
- [ ] **Add `map_searches` table** (for analytics)
  - [ ] `user_id` (FK to users)
  - [ ] `center_lat` (map center latitude)
  - [ ] `center_lng` (map center longitude)
  - [ ] `radius_km` (search radius)
  - [ ] `filters_applied` (JSON of applied filters)
  - [ ] `results_count` (number of properties shown)
- [ ] **Add `payment_status_indicators` table** (traffic light system)
  - [ ] `payment_id` (FK to payment_transactions)
  - [ ] `status` (enum: 'green', 'yellow', 'red')
  - [ ] `due_date` (date)
  - [ ] `days_until_due` (integer, calculated)
  - [ ] `days_overdue` (integer, calculated)
  - [ ] `late_fee_applied` (boolean)
  - [ ] `late_fee_amount` (decimal)
  - [ ] `last_reminder_sent` (timestamp)
  - [ ] `reminder_count` (integer)
- [ ] **Add `payment_notifications` table** (email/SMS log)
  - [ ] `payment_id` (FK to payment_transactions)
  - [ ] `user_id` (FK to users - boarder)
  - [ ] `notification_type` (enum: 'yellow_warning', 'red_overdue', 'escalation')
  - [ ] `channel` (enum: 'email', 'sms', 'in_app')
  - [ ] `sent_at` (timestamp)
  - [ ] `status` (enum: 'pending', 'sent', 'delivered', 'failed')
  - [ ] `message_content` (text)
  - [ ] `opened` (boolean)
  - [ ] `opened_at` (timestamp)

### 4. API Endpoints Needed (Sprint 2-3)

**Boarder-facing:**

- [ ] `GET /api/properties/search` - Advanced search with filters
- [ ] `POST /api/applications` - Submit rental application
- [ ] `GET /api/applications/:id/status` - Track application
- [ ] `POST /api/payments` - Process online payment
- [ ] `GET /api/payments/history` - Payment history
- [ ] `POST /api/reviews` - Submit landlord/property review
- [ ] `GET /api/documents` - Access contracts/receipts
- [ ] **`GET /api/payments/status` - Get payment status with traffic light indicator**
- [ ] **`GET /api/payments/upcoming` - Get upcoming payments with yellow status warnings**
- [ ] **`GET /api/payments/overdue` - Get overdue payments with red status**
- [ ] **`POST /api/notifications/preferences` - Set notification preferences (email/SMS)**
- [ ] **`GET /api/notifications/history` - View payment reminder history**
- [ ] **`GET /api/map/properties` - Get all properties within map bounds**
- [ ] **`GET /api/map/properties/nearby` - Get properties near user location (radius search)**
- [ ] **`GET /api/map/distance` - Calculate distance between two points**
- [ ] **`GET /api/map/landmarks` - Get nearby landmarks (universities, transport, shopping)**
- [ ] **`POST /api/map/favorites` - Save favorite map locations**
- [ ] **`GET /api/map/streetview` - Get street view image for property**

**Landlord-facing:**

- [ ] `GET /api/dashboard/analytics` - Business metrics
- [ ] `POST /api/announcements` - Send bulk announcement
- [ ] `GET /api/applications/pending` - Review queue
- [ ] `POST /api/applications/:id/decision` - Approve/reject
- [ ] `GET /api/payments/reconcile` - Reconcile payments
- [ ] `POST /api/reminders` - Send payment reminder
- [ ] `GET /api/reports/financial` - Generate financial report
- [ ] **`POST /api/map/property-location` - Set property location (auto-detect or custom pin)**
- [ ] **`PUT /api/map/property-location/:id` - Update property location/boundaries**
- [ ] **`POST /api/map/geocode` - Convert address to coordinates**
- [ ] **`GET /api/map/verification-status` - Check location verification status**
- [ ] **`POST /api/map/boundaries` - Draw and save property boundaries**
- [ ] **`GET /api/payments/status/all` - Get all payment statuses with traffic light indicators**
- [ ] **`POST /api/payments/calculate-late-fee` - Calculate automatic late fees**
- [ ] **`POST /api/notifications/send-batch` - Send batch notifications (yellow/red status)**
- [ ] **`GET /api/dashboard/payment-alerts` - Get count of yellow/red status payments**

---

## Success Metrics

### For Boarders

- ⏱️ **Time to find housing**: Reduce from hours/days to <30 minutes
- 📊 **Information completeness**: 100% of listings show price, rules, amenities
- 💳 **Payment security**: 100% of payments processed through secure system
- ⭐ **Transparency**: Rating system for all properties
- 🗺️ **Map discovery**: 80% of boarders use map view to find boarding houses near their university/location

### For Landlords

- 📈 **Occupancy rate**: Increase by 20% through better visibility
- 💰 **Payment collection time**: Reduce from 5-7 days to instant
- 📝 **Record accuracy**: 100% digital records, zero paper loss
- ⚡ **Process efficiency**: 50% reduction in administrative time
- 🚦 **Payment tracking**: 90% of rent collected on time with automated traffic light alerts
- 📧 **Notification effectiveness**: 70% reduction in late payments through yellow/red warnings

---

## Technical Debt Considerations

### Current Implementation Issues

1. **Static data** - All dashboard data is hardcoded, needs API integration
2. **No authentication flow** - Role detection is URL-based, not secure
3. **No database schema** - Backend needs complete data model
4. **No payment infrastructure** - Critical gap for core value proposition
5. **No notification system** - Essential for reminders and updates

### Migration Strategy

1. Keep current UI structure but replace static content with API calls
2. Implement proper authentication before adding sensitive features
3. Build payment integration as highest priority backend task
4. Add notification system (email/SMS) in parallel with payment work

---

## Next Steps

### Week 1-2: Foundation

- [ ] Finalize database schema
- [ ] Set up authentication system
- [ ] Create basic CRUD APIs for properties and applications
- [ ] Update dashboards to consume APIs (replace static data)

### Week 3-4: Core Features

- [ ] Integrate payment gateway
- [ ] Build application workflow
- [ ] Implement notification system
- [ ] Add search and filtering
- [ ] **Implement map view (Google Maps-inspired)**
  - [ ] Boarder: Interactive map with property pins
  - [ ] Boarder: Location auto-detect and radius search
  - [ ] Landlord: Auto-detect property location via GPS
  - [ ] Landlord: Custom pin placement and boundary drawing
  - [ ] Both: Distance calculator and nearby landmarks

### Week 5-6: Polish

- [ ] Add reviews and ratings
- [ ] Implement document management
- [ ] Build financial reports
- [ ] Mobile responsiveness testing
- [ ] **Implement payment status indicator system (traffic light)**
  - [ ] Backend: Payment status calculation logic (green/yellow/red)
  - [ ] Backend: Automated email notification triggers
  - [ ] Backend: Late fee auto-calculation
  - [ ] Frontend: Landlord dashboard payment status badges
  - [ ] Frontend: Boarder payment status view
  - [ ] Email templates for yellow/red notifications
  - [ ] SMS notification integration (optional)

---

## Map View Implementation Guide (Google Maps-Style Vertical Card)

### Overview

Implement a **split-screen map view** with:

- **Left side (60-70%)**: Interactive full-height map with property markers
- **Right side (30-40%)**: Scrollable vertical card panel (Google Maps-style) with property details, photos, reviews, and actions

### Visual Design Reference

**See `reference1.png` and `reference2.png`** for the Google Maps-style vertical card design to replicate:

**Key UI Elements (from references):**

- Photo gallery at top of card
- Property name, rating stars, review count, property type
- Action buttons row (Directions, Saved, Nearby, Share)
- Tab navigation (Overview / Reviews)
- Overview section: address, contact info, amenities
- Reviews section: rating distribution bars, overall rating, individual reviews with avatars
- "Write a review" button (for eligible boarders)
- "Suggest an edit" button (for owners)

### Role-Based Functionality

#### Landlord/Owner View

- Display **Edit Property** button to modify listing details
- Display **Update Location** button to adjust map pin
- Display **Manage Photos** button for photo gallery

#### Boarder View

- Display **Write a review** button (only if user has previously stayed at the property)
- View reviews with filtering options (by rating, keywords)
- Sort reviews (newest, highest rating, lowest rating)

### Implementation Checklist

#### Frontend (Sprint 4)

- [ ] Create map view container with split layout
- [ ] Implement vertical card panel with scrollable content
- [ ] Build photo gallery with overlay
- [ ] Create property header with rating display
- [ ] Implement action buttons (Directions, Save, Nearby, Share)
- [ ] Build tab system (Overview / Reviews)
- [ ] Create overview tab content (info sections, amenities)
- [ ] Build review summary with rating bars
- [ ] Implement reviews list with filtering
- [ ] Add role-based conditional rendering (owner vs boarder)
- [ ] Create edit property modal/form (landlord only)
- [ ] Implement review submission modal (boarder only)
- [ ] Add map marker click to open card
- [ ] Implement card close/minimize functionality
- [ ] Add responsive design for mobile
- [ ] Implement photo carousel/lightbox
- [ ] Add review sorting (newest, highest, lowest)
- [ ] Add review filtering by category

#### Backend (Sprint 3-4)

- [ ] Create `reviews` table schema
- [ ] Implement GET /api/properties/:id with reviews
- [ ] Implement POST /api/reviews with validation
- [ ] Implement review eligibility check (only after stay)
- [ ] Implement PUT /api/properties/:id (owner only)
- [ ] Implement PUT /api/properties/:id/location (owner only)
- [ ] Add owner verification middleware
- [ ] Implement review aggregation (average rating, count)
- [ ] Add review category ratings (cleanliness, location, value)
- [ ] Implement photo management endpoints
- [ ] Add review moderation (admin flag/review)

#### Data Model

- [ ] `reviews` table: id, property_id, user_id, rating, title, text, category ratings, stay_date, timestamps
- [ ] `property_photos` table: id, property_id, url, category, is_primary, display_order

---

### Week 7-8: Launch Prep

- [ ] Security audit
- [ ] Performance optimization
- [ ] User testing with actual clients (Jely & Yhang)
- [ ] Documentation and training materials

---

## Conclusion

The current dashboard implementation provides a **visual foundation** but doesn't solve the **core problems** identified in the pitch. This plan outlines the pivot needed to transform Haven Space from a "listing platform" into a **comprehensive management solution** that:

1. ✅ Eliminates physical house hunting (advanced search, map view, virtual tours)
2. ✅ Provides transparent information (complete details, reviews, verified badges)
3. ✅ Secures payments (online processing, digital receipts, auto-reminders)
4. ✅ Streamlines operations (automated rent collection, digital contracts, financial reports)
5. ✅ Improves communication (bulk announcements, structured messaging, notifications)

**Priority:** Focus on Phase 1 features first - these directly address the problems stated by Jely (student) and Yhang (landlord) in the pitch.
