# Room Edit Feature Documentation

## Overview

A new room management page has been added to the landlord dashboard that allows landlords to manage individual rooms within their properties. This feature is accessible by clicking on property images in the listings page.

## How to Access

1. Navigate to the landlord listings page (`/landlord/listings/`)
2. Click on any property image (property-img-6 or any property image)
3. You will be redirected to the room-edit page for that specific property

## Features

### Property Information Display

- Shows property name, location, type
- Displays total rooms, occupied rooms, and occupancy rate
- Provides context for room management

### Room Management

- **Add New Room**: Create new rooms with details like room number, price, size, capacity
- **Edit Existing Rooms**: Modify room information including pricing and status
- **Delete Rooms**: Remove rooms from the property
- **Tenant Management**: Assign tenants to rooms and manage tenant information

### Room Status Management

- **Available**: Room is ready for new tenants
- **Occupied**: Room has current tenant(s)
- **Maintenance**: Room is under maintenance/repair

### Search and Filter

- Search rooms by room number or tenant name
- Filter rooms by status (Available, Occupied, Maintenance)
- Sort rooms by number, price, or status

### Tenant Information

- When a room is marked as "Occupied", additional tenant fields appear:
  - Tenant name and contact information
  - Lease start and end dates
- Quick access to tenant details from room cards

## Technical Implementation

### Files Created/Modified

1. **`client/views/landlord/listings/room-edit.html`** - Main room management page
2. **`client/js/views/landlord/room-edit.js`** - JavaScript functionality for room management
3. **`client/js/views/landlord/landlord-listings.js`** - Modified to add click handlers for property images

### URL Structure

- Room edit page: `/landlord/listings/room-edit.html?propertyId={id}`
- Property ID is passed as a URL parameter to identify which property's rooms to manage

### API Endpoints Expected

The room-edit functionality expects the following API endpoints:

1. **GET** `/api/landlord/properties.php?id={propertyId}` - Get property details
2. **GET** `/api/landlord/rooms.php?property_id={propertyId}` - Get rooms for property
3. **POST** `/api/landlord/rooms.php` - Create new room
4. **PUT** `/api/landlord/rooms.php?id={roomId}` - Update existing room
5. **DELETE** `/api/landlord/rooms.php?id={roomId}` - Delete room

### Data Structure

Rooms are expected to have the following structure:

```json
{
  "id": 1,
  "property_id": 1,
  "room_number": "101",
  "price": 5000,
  "size": 12.5,
  "capacity": 2,
  "status": "available|occupied|maintenance",
  "description": "Room description",
  "tenant_name": "John Doe",
  "tenant_contact": "+639123456789",
  "lease_start": "2024-01-01",
  "lease_end": "2024-12-31"
}
```

## User Experience

- Intuitive navigation from property listings to room management
- Visual feedback with property images as clickable elements
- Responsive design that works on desktop and mobile
- Real-time updates when rooms are added, edited, or deleted
- Clear status indicators for room availability

## Future Enhancements

- Room photo upload functionality
- Bulk room operations (add multiple rooms at once)
- Room booking calendar integration
- Maintenance request tracking per room
- Payment history per room/tenant
