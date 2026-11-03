# Approve Leave Request — Spec

Status: Ready to implement · Interviewed 2026-10-26 · Updated with the unpaid-balance gate
Branch: `feat/apple-ui-restructure-qa-hardening`
Surfaces: `/landlord/boarders`, `/landlord/calendar` (day panel), `/boarder/tenancy`, `/boarder/payments`,
`POST /api/landlord/approve-leave-request`, notification bell, messages inbox

Source request: *"If the tenant requests leave, and the landlord sees it, it will have only Approve, and if
Approve is clicked there will be a modal popup that says about confirmation, and if clicked yes it will then
successfully."*

---

## 0. Baseline in the working tree

An earlier pass on this branch already landed part of this flow. Whoever implements the rest must **extend**
these files rather than duplicate them, and must reconcile them against this spec:

| Already present | File | Gap vs this spec |
| --- | --- | --- |
| Shared confirmation dialog | `apps/web/src/components/tenancy/ApproveLeaveDialog.tsx` | No balance pre-check, no disabled-confirm blocked state, no approver line. |
| Dialog wired into Boarders + calendar | `apps/web/src/routes/landlord/boarders.tsx`, `apps/web/src/components/calendar/LandlordCalendar.tsx` | No `outstanding_amount` on rows/events, no balance chip on the row. |
| Decline removed | `workers/api/src/routes/tenancy.ts`, `repositories/tenancy.ts`, `lib/api/landlord.ts` | Keep removed; ADR/test asserting 404 stays. |
| Lazy finalization | `finalizeDueLeaveRequests` in `repositories/tenancy.ts`, called from boarders, boarder tenancy, calendar, dashboard, notifications | Keep. |
| Approval notification + landlord message | `routes/tenancy.ts` (`notifyBoarderOfLeaveApproval`), `repositories/notifications.ts` | Notification metadata must carry the deep-link target (see §4.6). |
| Guard against re-request | `POST /api/boarder/leave-request` | Keep; add the submission warning (§4.7). |
| `approved_by` / `approved_at` | — | Missing entirely: needs migration `0024`. |
| Unpaid-balance gate | — | Missing entirely: the largest remaining piece. |

---

## 1. Request

A tenant submits a leave request. The landlord sees the pending request and is offered **only Approve** — no
Decline anywhere. Clicking Approve opens a confirmation modal that states what the approval does; confirming
approves the leave and reports success.

The interview resolved everything the sentence leaves open: what the modal says, what "success" changes in the
table, when the tenancy actually ends, what the tenant is told, what blocks an approval, and where approval can
be triggered from.

---

## 2. Current mechanics (verified)

| Concern | Location | Behaviour today |
| --- | --- | --- |
| Pending leave row | `apps/web/src/routes/landlord/boarders.tsx` | Row renders `status = leaving` with Approve; opens `ApproveLeaveDialog`; mutation fires `approveLeaveRequest`. |
| Approve route | `workers/api/src/routes/tenancy.ts` `POST /api/landlord/approve-leave-request` | Requires landlord, reads `application_id`, 404 when no pending request, calls `approvePendingLeaveRequest`, notifies best-effort, then `finalizeDueLeaveRequests`. |
| Approve repo | `workers/api/src/repositories/tenancy.ts` `approvePendingLeaveRequest` | Sets `leave_request_status='approved'`, frees the room, leaves open charges due, does not reset `users.boarder_status`. |
| Leave columns | migration `0011_tenancy_leave_requests.sql` | `leave_request_status` (`none`/`pending`/`approved`), `leave_request_date`, `leave_request_reason`, `intended_leave_date`. **No approver columns.** |
| Boarders row payload | `workers/api/src/repositories/landlord-boarders.ts` | Joins `paymentSummariesForApplications`, so `outstanding_total` per application is already computed and available — it is simply not exposed as a leave-approval input. |
| Calendar events | `workers/api/src/repositories/landlord-calendar.ts` | Emits `leave_requested` / `tenancy_move_out`; carries `application_id` and a `leave_request` detail object. |
| Boarder tenancy page | `apps/web/src/routes/boarder/tenancy.tsx` | `pending` → `PendingLeaveState`; `approved` → `ApprovedLeaveState`; otherwise the normal card with "Request to leave". |
| Notification shape | `workers/api/src/repositories/notifications.ts` | `type`, `title`, `message`, `metadata` (JSON). Boarder visibility via `roleVisibleTypes`. |

Outstanding balances already exist as `BoarderPaymentSnapshot.outstanding_total`
(`workers/api/src/repositories/payments/ledger.ts`) and as `outstandingFor(charge)` in
`workers/api/src/repositories/payments/types.ts`.

---

## 3. Decisions (complete interview record)

### 3.1 The action itself

1. **Decline is removed entirely** — UI, `POST /api/landlord/decline-leave-request`, `declinePendingLeaveRequest`,
   `declineLeaveRequest`, README entry, any test that asserted it works. A 404 assertion may remain to prove it
   is gone.
2. **Approve is the only leave action.** `Remove` (force-remove) stays available on a pending row and is the
   escape hatch for a request the landlord will not approve.
3. **Approve is offered in two places** — the Boarders table and the calendar day panel — both opening the same
   dialog with identical copy.
4. **Confirmation is mandatory.** No path approves without passing through the dialog.

### 3.2 What the dialog says

5. Contents: tenant name, property, room, leave date, submitted date, tenant's reason, and the consequences
   (room freed now, row stays until the date, immediate end when the date has passed).
6. Confirm button: **"Approve leave"**, primary (green), busy label "Approving…"; Cancel is ghost and disabled
   while the request is in flight.
7. **Wording style: direct and factual.** No exclamation, no "Are you sure?", no tenant-first-name title.

### 3.3 What approval does

8. The room is **freed at approval** (today's behaviour), not at the leave date.
9. The tenant **stays listed** as `Leaving approved` with their leave date until that date arrives.
10. **Open charges are not cancelled.** Unpaid debt survives the tenancy end.
11. **Finalization is lazy on read**: once the leave date has arrived, the next reconciling read closes the
    tenancy (`status='ended'`, `deleted_at` set, `users.boarder_status='new'`).
12. **Reconciling reads**: `GET /api/landlord/boarders`, `GET /api/boarder/tenancy`, `GET /api/landlord/calendar`,
    the landlord dashboard endpoint, `GET /api/notifications` (and unread count).
13. **Past-dated approvals finalize in the same request**; no `Leaving approved` row ever appears for them.
14. **No withdraw.** An approved departure cannot be cancelled by the tenant; any change goes through Messages.

### 3.4 Pending requests that are never approved

15. **A pending request never expires.** It stays pending until the landlord approves it or removes the boarder.
    No cron, no expiry column, no auto-decline.

### 3.5 The unpaid-balance gate (new)

16. **Approval is blocked when the tenant has any charge that is not fully verified/paid.** "Verified" means the
    charge is settled: submitted-but-unreviewed payments count as not settled, so a boarder with an
    `awaiting_verification` payment is still blocked.
17. **The block is a hard stop at the API**: 409, no partial approval, nothing written.
18. **Pre-check before confirm**: the approve button opens a dialog that already knows the amount; when the amount
    is greater than zero the dialog shows the balance and the confirm button is **disabled**. The landlord is
    never invited to click something that will come back as an error.
19. **The amount comes from the list payload, not an extra request**: `outstanding_amount` is added to the
    Boarders row and to the calendar event, so the dialog renders instantly. The API re-checks on confirm, so a
    stale number can never let a blocked approval through.
20. **The pending row shows the amount** (`₱2,400 due` note) so the landlord understands why approval will be
    blocked before clicking Approve.
21. **The calendar uses the identical gate** — same disabled confirm, same amount, same copy.
22. **The tenant is not blocked at submit** — only warned (§4.7).

### 3.6 Audit trail (new)

23. Store `approved_at` and `approved_by` on the application.
24. **Snapshot the approver's name** at approval time (`approved_by_name`) so the record stays correct if the
    landlord account is later renamed or deleted.
25. Show it: `Approved by {name} on {date}` in the Boarders row (approved state) and in the dialog when reopened
    for an already-approved request from the calendar.

### 3.7 Tenant side

26. **Boarder tenancy after approval**: read-only banner "Leave approved" + the end date, details still visible,
    no leave form, no "Request to leave" button.
27. **The leave-request conversation stays fully open** after approval — both parties can keep messaging in it.
    No lock, no archive, no system-notice replacement.
28. **Notification target**: clicking the `leave_request_approved` notification opens `/boarder/tenancy`.
29. **Notification copy**: title `Leave approved by {landlord}`, message
   `Your tenancy at {property} ends on {long date}.`
30. **A second leave request is blocked** while pending or approved (409 naming the end date when approved).
31. **Tenant submission warning**: the Request-to-leave form shows an inline amber note with the outstanding
    amount *before* submission, and submission still succeeds.

### 3.8 Failure handling and scope

32. **Failure UX**: the dialog stays open, details remain visible, the API message is shown inside it, nothing is
    lost, and the landlord can retry or Cancel.
33. **Best-effort side effects**: a failed notification/message insert must not turn a completed approval into an
    error (log it; approval stands).
34. **Tests: API only.** The dialog is verified by typecheck, build and a manual pass — no new component test file.
35. **Applies to property-access landlords, not just owners** — matching the existing Boarders access rule.
36. **Admin unchanged.**

---

## 4. Behaviour specification

### 4.1 `GET /api/landlord/boarders` — row gains the balance

Each row keeps its current shape and adds:

```jsonc
{
  "leave_request_status": "pending",
  "outstanding_amount": 2400,        // peso amount, 0 when settled
  "outstanding_charge_count": 2,     // optional, for tooltips
  "approved_by_name": null,          // set once approved
  "approved_at": null
}
```

`outstanding_amount` = sum over the application's charges of `outstandingFor(charge)`, reusing the ledger rules
(verified payments reduce it; `cancelled` charges are excluded; late fees included when applied). Do not invent a
second definition of "unpaid" — reuse `payments/types.ts`.

### 4.2 `POST /api/landlord/approve-leave-request`

1. Authenticate landlord (`requireLandlord`), read `application_id` (400 when missing).
2. Load the pending request scoped by property access, with `property_id`, `property_title`, `room_id`,
   `boarder_id`, `intended_leave_date`, and the landlord's own name. Missing/processed → 404
   `Leave request not found or already processed` (unchanged).
3. **Balance gate.** Compute the application's outstanding amount server-side.
   - If `outstanding > 0` → **409**, `code: "unsettled_balance"`, message
     `This tenant still owes ₱2,400. Settle or verify payments before approving.`, `details: { outstanding_amount }`.
   - No writes, no notification, no finalization on this path.
4. Approve, in one logical step:
   - `leave_request_status='approved'`, `approved_at = CURRENT_TIMESTAMP`, `approved_by = <landlord id>`,
     `approved_by_name = '<first last>'`;
   - leave `status='confirmed'` and `deleted_at NULL`;
   - free the room;
   - leave open charges untouched;
   - **do not** reset `users.boarder_status` yet.
5. Notify (best-effort, try/catch, logged): boarder notification + landlord message in the leave conversation
   (§4.5).
6. `finalizeDueLeaveRequests(db, { boarderId })` — closes immediately when the leave date is today or past.
7. Respond:

```json
{
  "success": true,
  "message": "Leave request approved successfully",
  "data": {
    "application_id": 200,
    "boarder_name": "Benny Boarder",
    "intended_leave_date": "2026-11-15",
    "finalized": false,
    "approved_at": "2026-11-03T08:15:00Z",
    "approved_by_name": "Liza Landlord"
  }
}
```

### 4.3 Lazy finalization (unchanged, restated)

`finalizeDueLeaveRequests(db, { landlordId?: number; boarderId?: number })`:

1. Select `leave_request_status='approved' AND status='confirmed' AND deleted_at IS NULL
   AND intended_leave_date IS NOT NULL AND intended_leave_date <= date('now')`, narrowed by
   `accessiblePropertyClause` or boarder id.
2. Set `status='ended'`, `deleted_at=CURRENT_TIMESTAMP`, `updated_at=CURRENT_TIMESTAMP`.
3. Set `users.boarder_status='new'` for the affected boarders.
4. Return the count.

Called before reads at the five surfaces in decision 12. It never touches rooms or payments — approval already
handled them.

### 4.4 Leave-request guard (unchanged)

`POST /api/boarder/leave-request`:

- `pending` → 409 `You already have a pending leave request…`
- `approved` → 409 `Your leave request has already been approved. Your tenancy ends on {YYYY-MM-DD}.`

### 4.5 Notification and message

- Notification: `type='leave_request_approved'`, title `Leave approved by {landlord}`,
  message `Your tenancy at {property} ends on {3 Nov 2026}.`,
  `metadata = { application_id, intended_leave_date, route: "/boarder/tenancy" }`.
- `leave_request_approved` is in the boarder's `roleVisibleTypes`.
- Message: `sender_id = landlordId`, text
  `Your leave request has been approved. Your tenancy at {property} ends on {3 Nov 2026}.`; touch the
  conversation's `updated_at`; create the conversation defensively if the request predates it.
- The conversation stays open for both sides afterwards.

### 4.6 Notification deep link

`metadata.route` is the navigation target. The notifications bell reads it and pushes the route on click; when a
notification has no `route`, it stays non-navigating (existing behaviour). For this feature the only value is
`/boarder/tenancy`.

### 4.7 Tenant submission warning

`POST /api/boarder/leave-request` gains, alongside its existing fields:

- Response field `outstanding_amount`.
- No new rejection.

The boarder form (`/boarder/tenancy`) fetches the current outstanding amount for the tenancy (it already has a
tenancy payload — extend it rather than adding a request) and renders, above the submit button:

> You have an unsettled balance of ₱2,400. Your landlord can't approve this request until it's settled.

### 4.8 Data model — migration `0024_leave_approval_audit.sql`

```sql
ALTER TABLE applications ADD COLUMN approved_at TEXT;
ALTER TABLE applications ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN approved_by_name TEXT;
```

`approved_by` uses `ON DELETE SET NULL`; `approved_by_name` is the durable display value (decision 24). No other
schema change: `outstanding_amount` is derived, not stored.

---

## 5. UI specification

### 5.1 Boarders table (`/landlord/boarders`)

**Pending leave row**

- Badge `Leaving` + leave date.
- Note `₱2,400 due` when `outstanding_amount > 0` (amber, small), nothing when settled.
- Actions: **Approve** (opens dialog), Message, Edit, Remove. No Decline.

**Approved leave row**

- Badge `Leaving approved` + leave date.
- `Approved by Liza Landlord on 3 Nov 2026` in muted text.
- Actions: Message only (no Approve, no Edit).

**Active row** — unchanged.

**State on the page**: `pendingApprove` (row or null), `approveError`. One mutation, approve-only. Success: close,
clear error, toast `Leave request approved.`, invalidate `['boarders', propertyId]`, `['landlord-rooms',
propertyId]`, `['landlord-properties']`, `['landlord-calendar']`. Failure: keep the dialog open with the message.

### 5.2 Confirmation dialog (shared component)

Same component on both surfaces. Three visual states:

**A — can approve**

```
Approve leave request?
Approving frees Room 3 at Sunrise Boarding House now. Benny Boarder stays listed
as "Leaving approved" until 15 Nov 2026. Open charges stay due.

Tenant        Benny Boarder
Property      Sunrise Boarding House
Room          Room 3
Leave date    15 Nov 2026
Requested on  2 Nov 2026
Reason        Moving closer to work

                                        [Cancel]  [Approve leave]
```

**B — blocked by balance**

```
Approve leave request?
This tenant still owes ₱2,400. Settle or verify payments before approving.

…same detail grid…

            [Cancel]  [Approve leave]   ← disabled, with "Unsettled balance" caption
```

The disabled confirm carries `aria-describedby` pointing at the balance warning; the warning is announced on
open (`role="status"`).

**C — busy / failed**

- Busy: confirm `Approving…`, Cancel disabled, modal cannot be dismissed by overlay or Escape.
- Failed: `ErrorState` above the buttons with the API message; details intact; buttons re-enabled.

**Copy rules**: dates long-form (`15 Nov 2026`); empty reason/date render `—`; when the leave date is today or
earlier the consequence sentence becomes *"The leave date has already arrived, so the tenancy ends
immediately."* The approver line (`Approved by … on …`) lives on the Boarders row, not in the dialog: the dialog
is only reachable while a request is pending, so it never opens for an already-approved leave.

**Layout**: centred modal on desktop; on < 640px it becomes a full-height scrollable sheet with the action row
pinned to the bottom, so a long reason cannot push the buttons off-screen.

### 5.3 Calendar day panel (`/landlord/calendar`)

- `CalendarDayPanel` gains `onApproveLeave(event)`; the event row shows **Approve** when
  `leave_request_status === 'pending'` and an `application_id` exists, next to the existing "Review leave
  request" link.
- `LandlordCalendar` owns the dialog and the mutation, reusing the component and copy; `outstanding_amount` comes
  from the event, so the same blocked state applies (decision 21).
- After approval the event renders as a `Leaving approved` chip with the date and no action; the link stays.
- Success invalidates `['landlord-calendar']` plus the boarder/property queries.

### 5.4 Boarder tenancy (`/boarder/tenancy`)

- `pending` → unchanged `PendingLeaveState`.
- `approved` → `ApprovedLeaveState`: banner `Leave approved` + `You're moving out on 15 Nov 2026.`, note
  `Your tenancy at {property} ends on 15 Nov 2026. Contact your landlord in Messages if your plans change.`,
  details visible, **no** Request-to-leave button or form.
- Tenancy with no leave request → the leave form, plus the balance warning from §4.7 when applicable.
- After the leave date the page falls back to `No active tenancy` (read finalizes).

### 5.5 Messages

No change. The approval message lands in the existing leave thread and both sides can keep replying.

---

## 6. API surface summary

| Change | Detail |
| --- | --- |
| Add columns | `approved_at`, `approved_by`, `approved_by_name` (migration `0024`) |
| Extend | `GET /api/landlord/boarders` rows: `outstanding_amount`, `approved_by_name`, `approved_at` |
| Extend | calendar `CalendarEvent`: `outstanding_amount` on leave events |
| Gate | approve → 409 `unsettled_balance` with `details.outstanding_amount` |
| Extend | approve response: `finalized`, `approved_at`, `approved_by_name` |
| Extend | `POST /api/boarder/leave-request` response: `outstanding_amount` |
| Extend | `leave_request_approved` notification `metadata.route = "/boarder/tenancy"` |
| Removed (keep removed) | `POST /api/landlord/decline-leave-request` + repo + client helper + README row |

---

## 7. Edge cases

| Case | Expected |
| --- | --- |
| Leave date today or past | Confirms with an "ends immediately" sentence; response `finalized: true`; row disappears. |
| Approved date passes with nobody opening the app | Next reconciling read closes the tenancy and resets `boarder_status`. |
| Two landlord tabs | Second attempt gets 404; dialog stays open with `Leave request not found or already processed`. |
| Tenant settles the balance while the dialog is open | Confirm is stale-disabled; the API re-check (decision 19) lets it through. Refresh re-enables. |
| Tenant pays but it is awaiting verification | Still blocked — unverified ≠ settled (decision 16). |
| Outstanding charge is cancelled mid-flow | It drops out of `outstandingFor`; not blocked. |
| Room already re-let | Finalization only closes the tenancy; room status untouched by it. |
| Boarder files again after approval | 409 with the end date. |
| Landlord with property access (not owner) | Can approve; `approved_by` records them. |
| Landlord deletes their account later | `approved_by_name` still renders; `approved_by` becomes NULL. |
| Pending request never approved | Stays pending indefinitely (decision 15); Remove is the escape hatch. |
| Notification/message insert fails | Approval still succeeds; failure logged. |
| Old cached calendar event without `outstanding_amount` | Treat as unknown → confirm enabled, API returns 409 with the amount and the dialog shows it. |
| Admin | No changes. |

---

## 8. Tests (API only)

`workers/api/test/tenancy.test.ts` (extend the existing file)

1. Approve with a future date and a settled balance → `leave_request_status='approved'`, `status='confirmed'`,
   `deleted_at IS NULL`, `approved_at`/`approved_by`/`approved_by_name` set, room available, open charges
   untouched only when none exist, `users.boarder_status` unchanged, `finalized:false`.
2. Same approval → exactly one `leave_request_approved` notification (title, message, metadata including
   `route`) and one landlord-authored message in the leave conversation.
3. Approve with an outstanding charge → 409 `unsettled_balance`, `details.outstanding_amount` correct,
   application still `pending`, no notification, no message.
4. Approve with a payment `awaiting_verification` → still 409 (unverified does not count as settled).
5. Approve with a past/today leave date → `finalized:true`, application `ended` + soft-deleted, boarder `new`.
6. Lazy finalization: approved with a past date, then `GET /api/boarder/tenancy` → `data:null` and `ended`;
   repeat via `GET /api/landlord/boarders`.
7. Boarders list exposes `outstanding_amount` matching the ledger, and `approved_by_name` after approval.
8. Re-request after approval → 409 naming the end date.
9. Leave submit with an outstanding balance → succeeds and returns `outstanding_amount > 0`.
10. Decline endpoint → 404.
11. Existing submit/pending tests keep passing.

Verification commands: `bun run cf:api:test`, `bun run cf:api:typecheck`, `bun run web:typecheck`,
`bun run web:test`, `bun run web:build`, plus `bun run --cwd workers/api migrate:local` for `0024`.
Manual pass: approve from Boarders and from the calendar; blocked state with an unpaid charge; error state from a
second tab; badge and approver line until the date; tenant notification deep link; read-only boarder page;
submission warning.

---

## 9. Acceptance criteria

1. A pending leave row shows **Approve** and no **Decline**; approved rows show only Message.
2. Approve (table or calendar) opens a confirmation dialog listing tenant, property, room, leave date,
   requested date, reason and consequences.
3. Confirming approves; success closes the dialog, toasts, and shows `Leaving approved` with the leave date and
   `Approved by … on …` — or removes the row when the date has passed.
4. A tenant with any unsettled charge cannot be approved: the dialog opens with the amount and a disabled
   confirm, and the API independently returns 409 `unsettled_balance`.
5. The pending row shows the outstanding amount when it is non-zero.
6. Approval frees the room and keeps open charges due, without ending the tenancy before the leave date.
7. Any reconciling read after the leave date closes the tenancy and resets the boarder's status.
8. The boarder gets a `leave_request_approved` notification that navigates to `/boarder/tenancy`, plus a
   landlord message in a thread that stays open.
9. The boarder's tenancy page shows a read-only approved banner, cannot submit another request, and warns about
   an unsettled balance in the form.
10. No decline route, helper, repo function or README row remains.
11. `cf:api:test`, both typechecks, `web:test` and `web:build` pass.

---

## 10. Out of scope

- Declining or rejecting a leave request.
- Expiring pending requests automatically.
- Cancelling, writing off, or settling charges as part of the approval.
- Generating a final bill or handling the deposit.
- Tenant-initiated withdrawal of an approved leave.
- Cron-based finalization (lazy reads only).
- Undoing an approval.
- Admin tooling or notifications for leave requests.
- Component tests for the dialog (decision 34).
