# Landlord Account Verification Flow - Testing Guide

## Overview

This guide covers testing the landlord account verification flow implemented on April 14, 2026.

## What Was Implemented

### 1. Welcome Modal Update

- **File**: `client/js/views/public/auth/signup-landlord.js`
- **Change**: Updated welcome modal message to inform users about pending verification
- **Message**: "Your account is currently under verification. You have read-only access until a superadmin approves your account."

### 2. Enhanced Permissions System

- **File**: `client/js/shared/permissions.js`
- **Features**:
  - Pending verification banner with "Check Status" button
  - Auto-refresh polling every 30 seconds
  - Success notification when verified
  - Automatic enabling of write actions after verification
  - Toast notification system for info/success/error/warning

### 3. CSS Styles

- **File**: `client/css/views/landlord/landlord.css`
- **Additions**:
  - Verification success notification (green theme)
  - Pending banner refresh button styles
  - Toast notification styles
  - Animations for banner/notification appearance

### 4. Backend Endpoint

- **File**: `server/api/landlord/verification-status.php`
- **Purpose**: Dedicated endpoint for checking verification status
- **URL**: `GET /api/landlord/verification-status.php`
- **Returns**: `{ success, data: { user_id, role, is_verified, account_status, created_at, checked_at } }`

## Testing Scenarios

### Scenario 1: New Landlord Signup

**Steps**:

1. Navigate to signup page
2. Complete landlord signup flow (all 5 steps)
3. Submit signup form

**Expected Results**:

- Welcome modal appears with message: "Your account is currently under verification..."
- "Go to Dashboard" button is visible
- Modal has green checkmark icon

**Pass Criteria**: ✅ Welcome modal shows pending verification message

### Scenario 2: Dashboard with Pending Verification

**Steps**:

1. Login as landlord with `is_verified = FALSE`
2. Wait for dashboard to load

**Expected Results**:

- Yellow/amber banner appears at top of content area
- Banner text: "Account Pending Verification"
- Banner explains read-only access
- "Check Status" button is visible in banner
- All write action buttons are disabled (grayed out, opacity 0.45)
- Write buttons include: Create Listing, Record Payment, etc.

**Pass Criteria**: ✅ Banner shows with read-only restrictions applied

### Scenario 3: Manual Status Check

**Steps**:

1. On dashboard with pending banner visible
2. Click "Check Status" button

**Expected Results**:

- Button shows loading state (spinning icon)
- If still pending: Shows info toast "Your account is still pending verification..."
- If now verified: Shows success notification (see Scenario 4)

**Pass Criteria**: ✅ Check Status button works and shows appropriate message

### Scenario 4: Verification Success (Database Update)

**Prerequisites**:

- Landlord dashboard open with `is_verified = FALSE`
- Access to database (phpMyAdmin or CLI)

**Steps**:

1. Open database and run: `UPDATE users SET is_verified = 1 WHERE email = 'landlord@test.com';`
2. Wait up to 30 seconds (auto-refresh polling)
   OR
3. Click "Check Status" button manually

**Expected Results**:

- Green success notification appears: "🎉 Your account has been verified!"
- Success message: "You now have full access to manage your properties."
- Pending banner is removed
- All write action buttons become enabled
- Notification auto-dismisses after 10 seconds
- Buttons return to normal opacity (1.0)

**Pass Criteria**: ✅ Success notification appears and write actions enabled

### Scenario 5: Auto-Refresh Polling

**Prerequisites**:

- Two browser windows/tabs open
- Tab 1: Landlord dashboard with `is_verified = FALSE`
- Tab 2: Database admin (phpMyAdmin)

**Steps**:

1. In Tab 1, note the time
2. Wait 30 seconds (don't click anything)
3. In Tab 2, update: `UPDATE users SET is_verified = 1 WHERE email = 'landlord@test.com';`
4. Wait another 30 seconds (next polling cycle)

**Expected Results**:

- Within 30 seconds of database update, success notification appears in Tab 1
- No user interaction required
- Auto-refresh continues polling until verification detected

**Pass Criteria**: ✅ Auto-refresh detects verification within 30 seconds

### Scenario 6: Already Verified Landlord

**Steps**:

1. Login as landlord with `is_verified = TRUE`
2. Wait for dashboard to load

**Expected Results**:

- No pending verification banner
- No success notification (unless just verified)
- All write actions enabled
- Console shows: "Landlord is verified"

**Pass Criteria**: ✅ No banner shown for verified landlords

### Scenario 7: Toast Notifications

**Steps**:

1. Trigger various toast notifications:
   - Error: Try invalid form submission
   - Success: Complete valid form submission
   - Warning: Submit form with warnings
   - Info: Click "Check Status" while pending

**Expected Results**:

- Toast appears in top-right corner
- Correct icon for each type (error circle, check circle, etc.)
- Correct border color (red, green, yellow, blue)
- Auto-dismisses after 5 seconds
- Close button works
- Click outside closes toast

**Pass Criteria**: ✅ All toast types display correctly

## Visual Testing

### Pending Banner

**Check**:

- [ ] Yellow/amber gradient background (`#fef3c7` to `#fde68a`)
- [ ] Yellow border (`#f59e0b`)
- [ ] Info icon in circle
- [ ] "Account Pending Verification" title
- [ ] Descriptive text about read-only access
- [ ] "Check Status" button with refresh icon
- [ ] Slide-in animation on appearance
- [ ] Responsive on mobile (stacks vertically)

### Success Notification

**Check**:

- [ ] Green gradient background (`#d1fae5` to `#a7f3d0`)
- [ ] Green border (`#10b981`)
- [ ] Checkmark icon in circle
- [ ] "🎉 Your account has been verified!" title
- [ ] Close button
- [ ] Slide-in animation
- [ ] Auto-dismisses after 10 seconds
- [ ] Dismiss animation (slide-out)

### Disabled Buttons

**Check**:

- [ ] Opacity reduced to 0.45
- [ ] Grayscale filter applied (30%)
- [ ] Cursor shows "not-allowed"
- [ ] Cannot click or interact
- [ ] Title attribute shows: "Action unavailable — account pending verification"

### Enabled Buttons (After Verification)

**Check**:

- [ ] Opacity returns to 1.0
- [ ] No grayscale filter
- [ ] Normal cursor
- [ ] Clickable and functional
- [ ] Hover effects work

## API Testing

### Test Verification Endpoint

**Command**:

```bash
curl -X GET http://localhost:8000/api/landlord/verification-status.php \
  -H "Cookie: access_token=YOUR_JWT_TOKEN"
```

**Expected Response** (Verified):

```json
{
  "success": true,
  "data": {
    "user_id": 123,
    "role": "landlord",
    "is_verified": true,
    "account_status": "active",
    "created_at": "2026-04-14 10:30:00",
    "checked_at": "2026-04-14 11:00:00"
  }
}
```

**Expected Response** (Not Verified):

```json
{
  "success": true,
  "data": {
    "user_id": 123,
    "role": "landlord",
    "is_verified": false,
    "account_status": "active",
    "created_at": "2026-04-14 10:30:00",
    "checked_at": "2026-04-14 11:00:00"
  }
}
```

**Error Cases**:

- No token: `401 No token provided`
- Invalid token: `401 Invalid or expired token`
- Non-landlord: `403 Access denied. This endpoint is for landlords only.`

## Performance Testing

### Auto-Refresh Polling

**Check**:

- [ ] Polling interval is exactly 30 seconds
- [ ] Each poll makes one HTTP request
- [ ] Network tab shows request every 30s
- [ ] No memory leaks (check Chrome DevTools Memory tab)
- [ ] Polling stops when verified (interval cleared)
- [ ] `window._verificationPollingInterval` is null after verification

### Dashboard Load Time

**Check**:

- [ ] Dashboard loads in < 2 seconds
- [ ] Verification check completes in < 500ms
- [ ] Banner appears immediately after load (if pending)
- [ ] No jank or stuttering during animations

## Edge Cases

### Edge Case 1: Network Error During Polling

**Test**: Disconnect network while polling is active
**Expected**: Polling continues when network restored, no crashes

### Edge Case 2: Multiple Dashboard Tabs

**Test**: Open dashboard in multiple tabs
**Expected**: Each tab polls independently, all detect verification

### Edge Case 3: Logout While Polling

**Test**: Logout while polling is active
**Expected**: Polling stops, no errors in console

### Edge Case 4: Token Expiry During Polling

**Test**: Wait for JWT to expire (or manually invalidate)
**Expected**: Polling handles 401 gracefully, redirects to login

### Edge Case 5: Rapid Status Changes

**Test**: Toggle `is_verified` TRUE → FALSE → TRUE quickly
**Expected**: Frontend detects final state correctly

## Bug Checklist

**Common Issues to Watch For**:

- [ ] Banner appears twice (duplicate initialization)
- [ ] Write actions not disabled (CSS selector mismatch)
- [ ] Polling doesn't stop after verification
- [ ] Success notification doesn't auto-dismiss
- [ ] Toast notifications stack up (don't remove old ones)
- [ ] Animations don't play (CSS keyframe errors)
- [ ] Mobile layout broken (responsive issues)
- [ ] Console errors during polling

## Reporting Results

For each test scenario, record:

- **Status**: Pass ✅ / Fail ❌
- **Browser**: Chrome/Firefox/Safari/Edge
- **Device**: Desktop/Mobile/Tablet
- **Notes**: Any issues observed
- **Screenshots**: For visual bugs

## Next Steps After Testing

1. **If all tests pass**: Mark feature as complete
2. **If tests fail**: Fix issues and re-test
3. **Admin UI**: Build admin dashboard for approving landlords
4. **Email Notifications**: Add email when verified/rejected
5. **Documentation**: Update user-facing docs

## Test Data Setup

### Create Test Landlord Account

```sql
INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, account_status, created_at)
VALUES ('Test', 'Landlord', 'landlord@test.com', '$2y$10$...', 'landlord', 0, 'active', NOW());
```

### Toggle Verification Status

```sql
-- Mark as verified
UPDATE users SET is_verified = 1 WHERE email = 'landlord@test.com';

-- Mark as pending
UPDATE users SET is_verified = 0 WHERE email = 'landlord@test.com';
```

### Check Current Status

```sql
SELECT id, email, role, is_verified, account_status, created_at
FROM users
WHERE email = 'landlord@test.com';
```
