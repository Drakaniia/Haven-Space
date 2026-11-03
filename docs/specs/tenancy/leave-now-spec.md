# Leave Now — Spec

Status: Implemented · Date: 2026-10-22 (automated checks pass; manual UI pass pending)
Surfaces: `/boarder/tenancy`, `POST /api/boarder/leave-now`, landlord notification bell, landlord Activity feed + calendar
Related spec: `docs/specs/approve-leave-request-spec.md` — **superseded in part**, see §3.14 and §12
Source request: "When the approve leave is approved by the landlord, the tenant needs to wait until the exact date to get
leave… what if the tenant wants to move now? Add a Leave now button; it appears after the landlord approves the leave request."
Follow-up decisions: "Leave will be unavailable until it pays its fees." · "Yes, recorded visibly."

---

## 1. Request

Today, an approved leave request keeps the tenancy open until the approved `intended_leave_date`. If the tenant needs to
move out sooner — e.g. the leave is approved on 22 Oct for 24 Oct — they have no way to end the tenancy early.

Add a **Leave now** action on `/boarder/tenancy` that:

1. Appears only after the landlord approves the leave request.
2. Ends the tenancy immediately, on the tenant's current Manila date.
3. Is confirmed first, because it cannot be undone.
4. Is unavailable while the tenancy has any unsettled charge.
5. Notifies the landlord through the notification bell.
6. Leaves a visible record on the landlord's Activity feed and calendar.

---

## 2. Current State (verified in the repo)

| Concern | File | Today |
| --- | --- | --- |
| Approval | `workers/api/src/routes/tenancy.ts` → `POST /api/landlord/approve-leave-request` | Sets `leave_request_status='approved'`, frees the room, **cancels the boarder's `pending`/`overdue` payments**. Leaves `status='confirmed'` and `deleted_at IS NULL`. |
| Lazy finalization | `workers/api/src/repositories/tenancy.ts` → `finalizeDueLeaveRequests` | Closes approved leaves whose `intended_leave_date <= date('now')`: `status='ended'`, `deleted_at=CURRENT_TIMESTAMP`, `users.boarder_status='new'`. |
| Boarder tenancy read | `GET /api/boarder/tenancy` | Runs lazy finalization, then returns `formatTenancy(...)` or `data: null`. The payload has `application_id`, `intended_leave_date`, `property_name`, `room_number`, `landlord.id`, but no payment balance. |
| Boarder page | `apps/web/src/routes/boarder/tenancy.tsx` | `ApprovedLeaveState` is read-only: banner "Leave approved", "You're moving out on {date}", details, no action. Wrapped in `RequireTenancy`. |
| Payments | `workers/api/src/repositories/payments/helpers.ts` | Open statuses are `pending`, `awaiting_verification`, `overdue`; `paid` and `cancelled` are settled. `outstandingFor` / `summarizeCharges` already define the money rules. |
| Landlord boarders | `workers/api/src/repositories/landlord-boarders.ts` | Lists `accepted`/`approved`/`confirmed` applications with `deleted_at IS NULL`, so an ended tenancy disappears. |
| Landlord calendar | `workers/api/src/repositories/landlord-calendar.ts` | `listApplicationEvents` filters `app.deleted_at IS NULL`, so ended tenancies never reach the calendar. |
| Landlord activity | `workers/api/src/repositories/landlord-activity.ts` | Reuses `listCalendarEventSources`; `tenancy_move_out` renders as "Tenancy ended". |
| Notification types | `workers/api/src/repositories/notifications.ts` → `roleVisibleTypes` | The landlord bell uses a fixed allow-list; an unknown type is filtered out. |
| Tests | `workers/api/test/tenancy.test.ts` | Approval tests currently assert that pending/overdue charges are cancelled. |

No schema change is needed. `deleted_at` records the actual move-out moment; `intended_leave_date` stays as the approved plan.
The outstanding balance is derived from `payments`.

---

## 3. Decisions (from the interview)

1. **"Leave now" ends the tenancy immediately** — self-service, no second landlord approval.
2. **The landlord is notified** with a bell notification. No message is posted into the leave conversation.
3. **Confirmation modal first**, because the action is irreversible.
4. **Visible as soon as the leave is approved and the approved date is still in the future.** No waiting window.
5. **Today only.** No date picker, no scheduling.
6. **Danger-styled button** (`variant="danger"`), placed in the approved-leave card.
7. **Boarder-only.** No landlord or admin early-move-out action.
8. **The approved leave date is preserved.** `deleted_at` records the real move-out. No `actual_leave_date` column.
9. **The tenant must settle every open charge on the current tenancy before leaving early** — `pending`, `overdue`, and
   `awaiting_verification` all count, balance > 0.
10. **Approval no longer cancels pending/overdue charges.** Unpaid fees survive approval and must be paid before Leave now.
    Unpaid debt also survives the tenancy end.
11. **Blocked UX:** the button is disabled with a balance note and a link to Payments. The endpoint independently returns 409.
12. **After leaving:** a toast plus the no-tenancy empty state. The boarder becomes `new`.
13. **If the approved date is today or past**, lazy finalization owns the close; the button is hidden.
14. **Supersedes approval decision 8** in `approve-leave-request-spec.md` ("Pending payments are cancelled at approval").
15. **The early departure is recorded visibly** in the landlord Activity feed and calendar on the actual move-out date,
    labelled "Left early".
16. **Testing:** API tests for the endpoint, fee gate, approval change and activity event; both typechecks, `web:test`,
    `web:build`, and a manual UI pass.
17. **No migration** and **no cron**.

---

## 4. Behavior Specification

### 4.1 Approval change (supersedes `approve-leave-request` §3.8 and §4.1)

`approvePendingLeaveRequest` stops calling `cancelPendingBoarderPayments`.

- The room is still freed at approval.
- `leave_request_status='approved'` and the tenancy stays `confirmed` until the leave date.
- Open charges remain open and remain visible to both landlord and tenant.
- If `cancelPendingBoarderPayments` has no other callers after this change, delete it and its import; do not leave dead code.
- Update `docs/specs/approve-leave-request-spec.md` (decision 8, §4.1, §8 test 1) when the code changes, so the two
  specs do not contradict each other.

**Consequence to accept:** a boarder can be approved and then wait for the leave date with unpaid rent. That debt is now
real, which is the point of the fee gate. Unpaid charges are not cancelled when the tenancy ends either.

### 4.2 Outstanding balance in the tenancy payload

Extend `GET /api/boarder/tenancy` / `formatTenancy` with:

```json
{
  "outstanding_balance": 2500,
  "open_charge_count": 2
}
```

Query, scoped to the current application:

```sql
SELECT COALESCE(SUM(amount + late_fee), 0) AS outstanding_balance,
       COUNT(*) AS open_charge_count
FROM payments
WHERE application_id = ?
  AND status IN ('pending', 'awaiting_verification', 'overdue')
```

- No partial-payment maths: a charge is either settled (`paid`) or fully outstanding, matching
  `outstandingFor` in `repositories/payments/types.ts`.
- `cancelled` and `paid` never count.
- Scope is the current `application_id`; charges from an old tenancy do not block this one.

### 4.3 New endpoint: `POST /api/boarder/leave-now`

Registered on the existing `tenancyRoutes` Hono app (`workers/api/src/routes/tenancy.ts`).

**Auth:** `authorizeUser(db, req, ['boarder'], JWT_SECRET)`.

**Body:**

```json
{ "application_id": 200 }
```

**Flow:**

1. Validate `application_id` as a positive integer → `400 "Application ID is required"`.
2. Run `finalizeDueLeaveRequests(db, { boarderId })` first.
3. `findCurrentTenancy(db, boarderId)`:
   - none → `404 "No active tenancy found."`
   - `application_id` does not match → `404 "Tenancy not found."`
4. Reject when `leave_request_status !== 'approved'` → `409 "You can only leave now after your landlord approves your leave request."`
5. Reject when `intended_leave_date` is `null` → `409 "Your leave request does not have an approved leave date."`
6. Reject when `intended_leave_date <= manilaToday()` → `409 "Your approved leave date has arrived. This tenancy is already closing."`
   Use `manilaToday()` from `workers/api/src/repositories/payments/helpers.ts`.
7. **Fee gate** — re-run the balance query from §4.2 at click time:
   - balance > 0 → `409 "You have an outstanding balance of ₱{amount}. Settle your fees before you can leave now."`
   - Return no state change and no notification.
8. End the tenancy with one guarded update (`endApprovedLeaveNow`):

   ```sql
   UPDATE applications
   SET status = 'ended',
       deleted_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
   WHERE id = ?
     AND boarder_id = ?
     AND status = 'confirmed'
     AND deleted_at IS NULL
     AND leave_request_status = 'approved'
   ```

   `meta.changes === 0` (double click, second tab, concurrent removal) → `409 "This tenancy has already ended."`
9. `UPDATE users SET boarder_status = 'new', updated_at = CURRENT_TIMESTAMP WHERE id = ?`.
10. Best-effort landlord notification and activity record. Never fail the request because either failed — same
    `try/catch` + `console.error` pattern as approval.
11. Response `200`:

```json
{
  "success": true,
  "message": "You've moved out. Your tenancy has ended.",
  "data": {
    "application_id": 200,
    "property_name": "Sunrise Boarding House",
    "room_number": "Room 3",
    "move_out_date": "2026-10-22"
  }
}
```

### 4.4 Room, payments, conversation

- **Do not touch the room.** It was freed at approval; a second `freeRoom` would decrement `occupied` twice.
- **Do not cancel anything.** The fee gate guarantees the visible open charges are settled before the tenancy ends.
- **Do not post a message** in the leave conversation. Bell + activity record only.

### 4.5 Landlord notification

Insert one row into `notifications` for `tenancy.landlord.id`:

- `type`: `boarder_left_early`
- `title`: `Boarder moved out early`
- `message`: `"Benny Boarder moved out of Room 3 at Sunrise Boarding House today, earlier than the approved 15 Nov 2026."`
- `metadata`:

```json
{
  "application_id": 200,
  "property_id": 12,
  "room_id": 34,
  "room_number": "Room 3",
  "approved_leave_date": "2026-11-15",
  "actual_move_out_date": "2026-10-22"
}
```

Add `'boarder_left_early'` to the landlord branch of `roleVisibleTypes` in
`workers/api/src/repositories/notifications.ts`.

### 4.6 Visible record (Activity feed + calendar)

Ended tenancies are currently filtered out of both surfaces (`app.deleted_at IS NULL`), so the move-out must be emitted by a
dedicated source.

Add `listEarlyDepartureEvents(db, landlordId, query)` in `workers/api/src/repositories/landlord-calendar.ts` and merge it
as a fourth source inside `listCalendarEventSources` (so the Activity feed gets it for free).

Query shape:

```sql
SELECT app.id, app.boarder_id, app.deleted_at, app.intended_leave_date,
       r.id AS room_id, COALESCE(r.room_number, r.title) AS room_title,
       pr.id AS property_id, pr.title AS property_title,
       u.first_name, u.last_name
FROM applications app
JOIN rooms r ON app.room_id = r.id
JOIN properties pr ON r.property_id = pr.id
JOIN users u ON app.boarder_id = u.id
WHERE app.status = 'ended'
  AND app.leave_request_status = 'approved'
  AND app.deleted_at IS NOT NULL
  AND app.intended_leave_date IS NOT NULL
  AND date(app.deleted_at) < app.intended_leave_date
  AND ${accessiblePropertyClause('pr')}
```

Window filter on the **Manila date of `deleted_at`**, not the approved date.

Emit:

```ts
{
  id: `application:${row.id}:tenancy_left_early`,
  type: 'tenancy_move_out',
  family: 'tenancy',
  date: manilaDate(deleted_at),
  occurred_at: toIsoTimestamp(deleted_at, manilaDate(deleted_at)),
  status: 'left_early',
  subject: boarder name,
  application_id: Number(row.id),
  boarder: { id, name },
  room: { id, name },
  property: { id, name },
  link: { to: '/landlord/boarders', label: 'View boarders' },
  leave_request: {
    reason: row.leave_request_reason ?? null,
    requested_on: row.leave_request_date ? toDateOnly(row.leave_request_date) : null,
    leave_date: toDateOnly(row.intended_leave_date)
  }
}
```

UI changes:

- `apps/web/src/lib/activity.ts` / `ActivityFeedRow`: when `type === 'tenancy_move_out' && status === 'left_early'`,
  render **"Tenancy ended early"** instead of "Tenancy ended".
- `apps/web/src/components/calendar/calendar-helpers.ts` → `eventTypeLabel`: return **"Left early"** for the same
  condition; the day panel's `StatusBadge` then shows `left early`.
- `apps/web/src/components/ui/StatusBadge.tsx`: add `left_early: 'bg-subtle text-gray-ink'` (neutral, not alarming).
- No new event *type* is added, so `CalendarEventType`, `ActivityEventType`, family filters and the activity type
  allow-list stay unchanged.

The original approved-date move-out event remains absent because the wait ended early; only the actual departure is shown.
The leave-requested event remains as history.

---

## 5. UI Specification

### 5.1 Approved-leave card (`/boarder/tenancy`)

`ApprovedLeaveState` gains the balance-aware action below the approved banner:

**Balance is zero**

```
[ Leave approved ]

You're moving out on 15 Nov 2026.
Your tenancy at Sunrise Boarding House ends on 15 Nov 2026.
If you need to move out sooner, you can leave now. Your landlord will be notified
and your tenancy ends today.

[ Leave now ]                                    (danger, solid red)
```

**Balance is greater than zero**

```
You have an outstanding balance of ₱2,500. Settle your fees before you can leave now.
Payments awaiting your landlord's verification also count.
[ Go to Payments ]                               (link to /boarder/payments)

[ Leave now ]                                    (danger, disabled)
```

- Button visibility: `leave_status === 'approved'`, `intended_leave_date` present and `> manilaToday()`.
- Disabled when `outstanding_balance > 0`; use `disabled` on `Button` (the shared style already dims it) plus the note.
- The balance refreshes when the tenant returns from Payments because the `['tenancy']` query refetches on mount. No polling.
- If the button is clicked with a stale zero balance, the endpoint's 409 appears inside the modal.

### 5.2 Confirmation modal

Built on the shared `Modal`, owned by `TenancyPage` (state + mutation), reusing `ApiRequestError` and `ErrorState`.

```
Leave now?

This ends your tenancy at Sunrise Boarding House today, 22 Oct 2026. The room was already
released when your leave was approved. Your landlord will be notified.

Approved leave date   15 Nov 2026
Move-out date         22 Oct 2026
Room                  Room 3

This cannot be undone.

[error, if any]

                                    [Cancel]  [Leave now]
```

- Cancel: `variant="ghost"`, disabled while busy.
- Confirm: `variant="danger"`, label `Leave now`, busy label `Leaving…`, disabled while pending.
- Closing on overlay/Escape only when not busy.
- Failures (including a newly discovered balance) keep the modal open with the API message.

### 5.3 After success

- Close the modal and toast: **"You've moved out. Your tenancy has ended."**
- Invalidate `['tenancy']` and `[BOARDER_STATUS_KEY]`.
- Show the expected no-tenancy state without a flash of the approved card: a local `justLeft` flag renders the existing
  `EmptyState` (`title="No active tenancy"`, `description="You've moved out. Your tenancy at {property} has ended."`).
- A fresh visit renders the existing `FeatureGate` ("Not available yet" + Go to Applications), because `boarder_status`
  is now `new`.
- Keep `<ToastStack>` mounted outside the `RequireTenancy` branch so the toast survives the status flip.

---

## 6. API Surface Changes

| Change | Detail |
| --- | --- |
| Add | `POST /api/boarder/leave-now` (boarder auth, body `{ application_id }`) |
| Add | `endApprovedLeaveNow(db, applicationId, boarderId)` in `repositories/tenancy.ts` |
| Add | `notifyLandlordOfEarlyMoveOut(...)` in `repositories/tenancy.ts` |
| Add | `boarder_left_early` notification type, visible to landlords |
| Add | `listEarlyDepartureEvents(...)` merged into `listCalendarEventSources` |
| Add | `outstanding_balance` + `open_charge_count` on the tenancy payload |
| Add | `leaveNow(token, applicationId)` client helper in `apps/web/src/lib/api/boarder.ts` |
| Change | `approvePendingLeaveRequest` no longer cancels pending/overdue charges |
| Change | `ApprovedLeaveState` gains the balance note, Payments link, button and modal |
| Change | Activity sentence / calendar label / StatusBadge for `left_early` |
| No change | Room state, conversation messages, admin, activity event types, schema |

No migration.

---

## 7. Edge Cases

| Case | Expected |
| --- | --- |
| Leave still `pending` / `none` | 409 "after your landlord approves"; button never shown. |
| No current tenancy | 404; button never shown. |
| `application_id` from a stale page | 404 "Tenancy not found." |
| Approved date is today or past | Lazy finalization closes it; button hidden; endpoint 404/409. |
| Approved date is `null` | Button hidden; endpoint 409. |
| Outstanding balance > 0 | Button disabled with the balance note; endpoint 409 with the amount if forced. |
| Payment awaiting verification | Counts as outstanding; tenant is told verification pending. |
| Tenant settles the balance | Returning to `/boarder/tenancy` refetches and enables the button. |
| Charge generated after approval | It counts and blocks Leave now until settled. Accepted consequence of the "all open charges" rule. |
| Double click / two tabs | First call ends it; second gets 409. |
| Landlord removes the boarder at the same time | `changes === 0` / no tenancy → 409/404. |
| Landlord has the Boarders page open | The row disappears on the next read. |
| Notification or activity insert fails | Tenancy still ends; error logged; response stays successful. |
| Room already freed at approval | Left alone. |
| Unpaid charges after leaving on the approved date | They remain owed; finalization does not cancel them. |
| Landlord / admin tries the endpoint | 403. |
| Timezone | Fee and date comparisons use `manilaToday()`; activity event dates use Manila `deleted_at`. |

---

## 8. Tests

`workers/api/test/tenancy.test.ts`:

1. Approval with a future leave date: application stays `confirmed`, room freed, **pending/overdue charges remain open**
   (updated from the old cancellation assertion), `boarder_status` unchanged, response `finalized:false`.
2. `GET /api/boarder/tenancy` before payment returns `outstanding_balance > 0` and `open_charge_count > 0`.
3. `POST /api/boarder/leave-now` with an open balance → 409 with the amount; application still `confirmed`,
   no `boarder_left_early` notification.
4. Mark the charges `paid` (or `cancelled`) → same call succeeds: `status='ended'`, `deleted_at` set,
   `intended_leave_date` unchanged, `boarder_status='new'`, room `occupied` unchanged, payment rows untouched.
5. A charge in `awaiting_verification` still blocks.
6. Success inserts one `boarder_left_early` landlord notification with the expected title/message/metadata.
7. Success adds one `tenancy_move_out` event with `status='left_early'` on the actual move-out date to the landlord
   activity feed / calendar; the approved-date move-out event is not duplicated.
8. `pending`/`none` leave → 409; no tenancy → 404; missing `application_id` → 400; second call → 409/404.
9. Approved date today/past → lazy finalization wins; no early-departure event or notification is created.
10. Existing submit/approve/finalize tests keep passing after the cancellation change.

Run: `bun run cf:api:test`, `bun run cf:api:typecheck`, `bun run web:typecheck`, `bun run web:test`, `bun run web:build`.

Manual pass: approve a leave, verify the balance note and disabled button, pay the charges, return and leave, check the
toast, the collapsed nav, the landlord bell, the Activity entry ("Tenancy ended early"), and the calendar event.

---

## 9. Acceptance Criteria

1. Approval no longer cancels the boarder's pending/overdue charges.
2. With an open balance, `/boarder/tenancy` shows a disabled **Leave now**, the amount, and a Payments link.
3. After the fees are paid, the button enables on the next visit.
4. Before approval / while pending, no button appears.
5. Confirming **Leave now** ends the tenancy today; `deleted_at` records it; the approved date is unchanged.
6. The room is not decremented twice; settled payments are untouched.
7. The landlord receives one `boarder_left_early` notification naming tenant, room, property, and approved date.
8. The landlord Activity feed and calendar show a "Left early" / "Tenancy ended early" event on the actual move-out date.
9. Cancelling the modal changes nothing; server-side failures keep it open with the message.
10. Double submissions cannot end the tenancy twice or duplicate notifications/events.
11. `cf:api:test`, both typechecks, `web:test`, and `web:build` pass.

---

## 10. Out of Scope

- Choosing or scheduling an earlier departure date.
- Landlord- or admin-initiated early move-out.
- Withdrawing an approved leave or editing the approved date.
- Deposit refunds, final bills, pro-rated rent, or payment adjustments.
- Posting an automatic message into the leave conversation.
- A scheduled cron.
- Undoing a completed leave-now.
- Changing how payment reminders or the billing run treat an approved-but-not-ended tenancy.

---

## 11. Implementation Calls

1. Endpoint `POST /api/boarder/leave-now`; body `{ application_id }` for race safety.
2. Repo functions stay in the existing tenancy repository (`endApprovedLeaveNow`, `notifyLandlordOfEarlyMoveOut`).
3. Fee gate derived from `payments` statuses `pending`/`awaiting_verification`/`overdue`, scoped to the application.
4. Balance is exposed on the tenancy payload so the UI does not need a second request.
5. `deleted_at` is the recorded move-out; `intended_leave_date` is never overwritten.
6. Early departure reuses the `tenancy_move_out` event type with `status='left_early'`; no new event type.
7. Activity/calendar label changes are conditional on that status, so normal move-outs keep their copy.
8. A local `justLeft` state renders the "No active tenancy" empty state after success; fresh visits show `FeatureGate`.
9. Success toast stays outside the tenancy gate.
10. API tests + typechecks + `web:test` + build + manual UI; no frontend unit tests.

### Known existing wrinkle (not changed here)

`finalizeDueLeaveRequests` compares `intended_leave_date <= date('now')` in UTC, while the UI compares against
`manilaToday()`. Between 00:00 and 08:00 Manila on the approved date the UI hides the button while lazy finalization may
not have closed the tenancy yet. The new endpoint uses `manilaToday()` so a tenant can never end a tenancy whose approved
date has already arrived in Manila.

---

## 12. Supersession of `approve-leave-request-spec.md`

This spec changes one decision from the approval spec:

| Old approval spec | Now |
| --- | --- |
| §3 decision 8: "Pending payments are cancelled at approval (today's behaviour)." | Open charges are kept and must be settled before **Leave now**. |
| §4.1 step 4: "cancel the boarder's `pending`/`overdue` payments" | Removed from `approvePendingLeaveRequest`. |
| §8 test 1: "pending payments cancelled" | Reversed: pending/overdue charges remain open. |
| §7 edge case: "Pending payments — cancelled at approval" | Open until paid; they also survive finalization. |

Everything else in the approval spec (room freed at approval, lazy finalization, guard, notification, boarder read-only
state) still applies.
