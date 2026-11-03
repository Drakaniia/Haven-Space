# Specs

One file per feature. Decisions in a spec are binding until a later spec amends them, so read the newest
amendment named in a spec's header before changing behaviour it covers.

## Payments

| Spec                                                                                           | Surface                                             |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`payments-feature-spec`](payments/payments-feature-spec.md)                                   | Charge ledger, boarder submissions, landlord review |
| [`payments-tracker-redesign-spec`](payments/payments-tracker-redesign-spec.md)                 | Tracker rows, statuses, sorting                     |
| [`landlord-payments-monitoring-spec`](payments/landlord-payments-monitoring-spec.md)           | Monitoring page, review drawer                      |
| [`payments-page-regressions-spec`](payments/payments-page-regressions-spec.md)                 | Regression fixes on the payments pages              |
| [`payments-shell-reverification-spec`](payments/payments-shell-reverification-spec.md)         | Shell/layout re-verification                        |
| [`payments-shell-two-pages-reverify-spec`](payments/payments-shell-two-pages-reverify-spec.md) | Two-page shell re-verification                      |

## Landlord

| Spec                                                                                       | Surface                                        |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| [`landlord-calendar-spec`](landlord/landlord-calendar-spec.md)                             | `/landlord/calendar` aggregation and day panel |
| [`landlord-dashboard-redesign-spec`](landlord/landlord-dashboard-redesign-spec.md)         | `/landlord` dashboard cards and activity feed  |
| [`landlord-rooms-grid-spec`](landlord/landlord-rooms-grid-spec.md)                         | Room grid                                      |
| [`landlord-properties-card-layout-spec`](landlord/landlord-properties-card-layout-spec.md) | Property cards                                 |
| [`landlord-property-detail-page-spec`](landlord/landlord-property-detail-page-spec.md)     | Property detail page                           |

## Tenancy and listings

| Spec                                                                              | Surface                                         |
| --------------------------------------------------------------------------------- | ----------------------------------------------- |
| [`approve-leave-request-spec`](tenancy/approve-leave-request-spec.md)             | Leave approval, balance gate, lazy finalization |
| [`leave-now-spec`](tenancy/leave-now-spec.md)                                     | Early move-out after an approved leave          |
| [`create-listing-room-details-spec`](tenancy/create-listing-room-details-spec.md) | Listing creation, room details                  |
| [`edit-listing-property-info-spec`](tenancy/edit-listing-property-info-spec.md)   | Editing property information                    |

## Boarder, messages, admin, platform

| Spec                                                                          | Surface                       |
| ----------------------------------------------------------------------------- | ----------------------------- |
| [`find-a-room-map-modal-spec`](boarder/find-a-room-map-modal-spec.md)         | Map modal and location opt-in |
| [`messages-feature-review-spec`](messages/messages-feature-review-spec.md)    | Inbox, threads, unread badge  |
| [`admin-apple-ui-restructure-spec`](admin/admin-apple-ui-restructure-spec.md) | Admin shell and screens       |
| [`settings-signin-method-spec`](platform/settings-signin-method-spec.md)      | Sign-in method settings       |
| [`guest-ai-limit-spec`](platform/guest-ai-limit-spec.md)                      | Guest AI quota                |
| [`toast-system-spec`](platform/toast-system-spec.md)                          | Toasts                        |

## Adding a spec

1. Copy the section order from an existing spec: request → current state → decisions → behaviour → UI →
   API surface → edge cases → tests → acceptance criteria → out of scope.
2. Name it `<feature>-spec.md` and place it in the domain folder it touches.
3. Cite other specs by bare name, not path.
