# Boarder JavaScript

JavaScript modules for boarder dashboard views.

## Files

| File                      | Description                                 |
| ------------------------- | ------------------------------------------- |
| `boarder.js`              | Boarder dashboard home functionality        |
| `boarder-rooms.js`        | Room browsing and details                   |
| `boarder-applications.js` | Rental application submission and tracking  |
| `boarder-payments.js`     | Payment viewing and processing              |
| `boarder-maintenance.js`  | Maintenance request submission and tracking |

## Exports

```javascript
// boarder.js
export function initBoarder() {}

// boarder-rooms.js
export function initBoarderRooms() {}

// boarder-applications.js
export function initBoarderApplications() {}

// boarder-payments.js
export function initBoarderPayments() {}

// boarder-maintenance.js
export function initBoarderMaintenance() {}
```

## Usage

```html
<!-- Dashboard home -->
<script type="module" src="../../../js/views/boarder/boarder.js"></script>

<!-- Rooms -->
<script type="module" src="../../../js/views/boarder/boarder-rooms.js"></script>

<!-- Applications -->
<script type="module" src="../../../js/views/boarder/boarder-applications.js"></script>

<!-- Payments -->
<script type="module" src="../../../js/views/boarder/boarder-payments.js"></script>

<!-- Maintenance -->
<script type="module" src="../../../js/views/boarder/boarder-maintenance.js"></script>
```
