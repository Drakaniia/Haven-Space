# Onboarding UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a tailored multi-step onboarding wizard for Boarders and Landlords, including database schema updates, restrictive UI components (banner/modal), and API endpoints for progressive saving.

**Architecture:**

- Backend: A new D1 migration adds JSON preference columns and verification fields. Hono API routes handle step-by-step auto-saving and validation.
- Frontend: TanStack Start routing handles the wizard wrapper (`WizardLayout`) and individual steps. Zod handles strict validation. A React context or Zustand store (if needed, or just standard React state lifted to the route) tracks cross-step data.
- UI: Uses Framer Motion / TanStack transitions for fluid animations and a responsive stepper.

**Tech Stack:** React, TanStack Start, Tailwind CSS, Hono, Cloudflare D1, Zod, Framer Motion.

**Spec:** `@onboarding-ui-spec.md`

## Global Constraints

- **Saving Strategy:** Auto-save per step. Data is committed via API calls before proceeding to the next step.
- **Validation:** Strict validation via Zod schemas on both frontend and backend.
- **Optionality:** Users can skip, triggering a persistent banner and action-triggered modals.
- **Animations:** Fluid animations using Framer Motion or CSS springs.
- **Responsiveness:** Balanced responsive design (works well on mobile and desktop).

---

### Task 1: Database Migration for Onboarding Fields

**Files:**

- Create: `workers/api/migrations/0015_onboarding_fields.sql`
- Modify: `workers/api/src/repositories/account.ts`

**Interfaces:**

- Consumes: Existing `boarder_profiles` and `landlord_profiles` tables.
- Produces: Updated schema with `search_preferences` (JSON), `emergency_contact_name`, `emergency_contact_phone` on `boarder_profiles`; `business_bio`, `stripe_connect_id`, `verification_status` on `landlord_profiles`.

- [ ] **Step 1: Write the migration script**

```sql
-- workers/api/migrations/0015_onboarding_fields.sql
ALTER TABLE boarder_profiles ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE boarder_profiles ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE boarder_profiles ADD COLUMN search_preferences TEXT; -- JSON string

ALTER TABLE landlord_profiles ADD COLUMN business_bio TEXT;
ALTER TABLE landlord_profiles ADD COLUMN stripe_connect_id TEXT;
ALTER TABLE landlord_profiles ADD COLUMN verification_status TEXT DEFAULT 'pending';
```

- [ ] **Step 2: Run the migration locally**

Run: `bun run --cwd workers/api migrate:local`
Expected: Migration applies successfully.

- [ ] **Step 3: Update TypeScript definitions in repositories**

```typescript
// workers/api/src/repositories/account.ts
// Update the interfaces to include the new fields
// e.g., emergency_contact_name: string | null; search_preferences: string | null;
```

- [ ] **Step 4: Commit**

```bash
git add workers/api/migrations/0015_onboarding_fields.sql workers/api/src/repositories/account.ts
git commit -m "feat(db): add onboarding schema fields to boarder and landlord profiles"
```

### Task 2: Backend API Endpoints for Auto-Saving

**Files:**

- Modify: `workers/api/src/routes/account.ts`
- Modify: `workers/api/src/repositories/account.ts`

**Interfaces:**

- Consumes: Updated database schemas.
- Produces: Enhanced `POST /api/boarder/update-onboarding` and new `POST /api/landlord/update-onboarding` endpoints that accept partial JSON data (step data) and update the respective profiles.

- [ ] **Step 1: Write failing tests** (assuming existing route tests in `workers/api/test/`)
- [ ] **Step 2: Implement repository functions for updating specific fields**
- [ ] **Step 3: Implement Hono route handlers** with Zod validation for incoming step data.
- [ ] **Step 4: Run tests to verify**
- [ ] **Step 5: Commit**

### Task 3: Shared UI Components (WizardLayout & Stepper)

**Files:**

- Create: `apps/web/src/components/onboarding/WizardLayout.tsx`
- Create: `apps/web/src/components/onboarding/Stepper.tsx`

**Interfaces:**

- Consumes: Framer Motion for transitions.
- Produces: A wrapper component that takes `currentStep`, `totalSteps`, `title`, and `children`, rendering a fluidly animated container and progress indicator.

- [ ] **Step 1: Build the `Stepper` component** (shows circles/lines for progress)
- [ ] **Step 2: Build the `WizardLayout` component** using Framer Motion `<AnimatePresence>` for step transitions.
- [ ] **Step 3: Commit**

### Task 4: Shared Restrictions (Banner & Modal)

**Files:**

- Create: `apps/web/src/components/shared/RestrictionBanner.tsx`
- Create: `apps/web/src/components/shared/RestrictionModal.tsx`
- Modify: `apps/web/src/components/layout/RoleShell.tsx`

**Interfaces:**

- Consumes: Global user/profile context (to check `onboarding_completed_at` and `onboarding_dismissed_at`).
- Produces: A persistent top banner if onboarding is incomplete/skipped, and an action-blocking modal component.

- [ ] **Step 1: Build `RestrictionBanner`**
- [ ] **Step 2: Build `RestrictionModal`**
- [ ] **Step 3: Integrate `RestrictionBanner` into `RoleShell`** so it displays globally when required.
- [ ] **Step 4: Commit**

### Task 5: Boarder Onboarding Flow

**Files:**

- Create: `apps/web/src/routes/onboarding/boarder.tsx`
- Create: `apps/web/src/components/onboarding/boarder/StepProfile.tsx`
- Create: `apps/web/src/components/onboarding/boarder/StepPreferences.tsx`

**Interfaces:**

- Consumes: `WizardLayout`, API auto-save endpoints.
- Produces: The 2-step boarder wizard.

- [ ] **Step 1: Build `StepProfile`** (Avatar, Bio, Occupation, Emergency Contacts) with Zod validation.
- [ ] **Step 2: Build `StepPreferences`** (Budget range, locations, move-in dates) with Zod validation.
- [ ] **Step 3: Build `boarder.tsx` route** to tie them together and handle API calls (`auto-save`).
- [ ] **Step 4: Commit**

### Task 6: Landlord Onboarding Flow

**Files:**

- Create: `apps/web/src/routes/onboarding/landlord.tsx`
- Create: `apps/web/src/components/onboarding/landlord/StepProperty.tsx`
- Create: `apps/web/src/components/onboarding/landlord/StepVerification.tsx`
- Modify: `apps/web/src/routes/landlord/onboarding.tsx` (redirect or replace with the new flow)

**Interfaces:**

- Consumes: `WizardLayout`, API auto-save endpoints.
- Produces: The 3-step landlord wizard (Extended Profile, First Property, Verification).

- [ ] **Step 1: Build `StepProperty`** (First listing creation).
- [ ] **Step 2: Build `StepVerification`** (Identity, Stripe Connect).
- [ ] **Step 3: Build `landlord.tsx` route** to orchestrate. (Include step 1 Extended Profile inline or as another component).
- [ ] **Step 4: Commit**

### Task 7: Onboarding Dispatcher & Trigger

**Files:**

- Create: `apps/web/src/routes/onboarding/index.tsx`
- Modify: `apps/web/src/routes/auth/choose-role.tsx` (or equivalent post-signup handler)

**Interfaces:**

- Consumes: User context/role.
- Produces: Redirects to the correct onboarding flow based on role, and triggers onboarding after signup.

- [ ] **Step 1: Build `onboarding/index.tsx`** to redirect to `/onboarding/boarder` or `/onboarding/landlord`.
- [ ] **Step 2: Update post-signup logic** to route users to `/onboarding` instead of the dashboard.
- [ ] **Step 3: Run full typecheck and build**
- [ ] **Step 4: Commit**
