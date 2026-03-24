# Landlord JavaScript

JavaScript modules for landlord dashboard views.

## Files

| File                       | Description                           |
| -------------------------- | ------------------------------------- |
| `landlord.js`              | Landlord dashboard home functionality |
| `landlord-listings.js`     | Property listing management (CRUD)    |
| `landlord-applications.js` | Application review and management     |
| `landlord-payments.js`     | Payment tracking and recording        |
| `landlord-maintenance.js`  | Maintenance request management        |

## Exports

```javascript
// landlord.js
export function initLandlord() {}

// landlord-listings.js
export function initLandlordListings() {}

// landlord-applications.js
export function initLandlordApplications() {}

// landlord-payments.js
export function initLandlordPayments() {}

// landlord-maintenance.js
export function initLandlordMaintenance() {}
```

## Usage

```html
<!-- Dashboard home -->
<script type="module" src="../../../js/views/landlord/landlord.js"></script>

<!-- Listings -->
<script type="module" src="../../../js/views/landlord/landlord-listings.js"></script>

<!-- Applications -->
<script type="module" src="../../../js/views/landlord/landlord-applications.js"></script>

<!-- Payments -->
<script type="module" src="../../../js/views/landlord/landlord-payments.js"></script>

<!-- Maintenance -->
<script type="module" src="../../../js/views/landlord/landlord-maintenance.js"></script>
```
