import { createFileRoute } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { AdminSection } from '../../components/admin/AdminSection';
import { PropertyAccessTab } from '../../components/admin/PropertyAccessTab';
import { ApplicationsSection } from '../../components/admin/sections/ApplicationsSection';
import { AuditSection } from '../../components/admin/sections/AuditSection';
import { LandlordsSection } from '../../components/admin/sections/LandlordsSection';
import { OverviewSection } from '../../components/admin/sections/OverviewSection';
import { PropertiesSection } from '../../components/admin/sections/PropertiesSection';
import { SettingsSection } from '../../components/admin/sections/SettingsSection';
import { UsersSection } from '../../components/admin/sections/UsersSection';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { ToastStack, useToasts } from '../../components/ui/Toast';
import { useAuth } from '../../lib/auth-context';
import {
  ADMIN_NAV,
  ADMIN_SECTION_LABELS,
  toAdminSectionKey,
  type AdminSectionKey,
} from '../../lib/nav';

/**
 * The admin console.
 *
 * One route, eight sections, and the open section is a **search param**
 * (`/admin?tab=users`) rather than local state — so a section is deep-linkable,
 * survives a refresh, and Back steps between sections instead of leaving admin
 * (`admin-apple-ui-restructure` D5/R6/R7). `validateSearch` is non-throwing: an
 * absent or unrecognised value lands on Overview, never a blank pane (D25/R6).
 *
 * The seven-item tab bar this replaces is gone; the sections are now the
 * sidebar (`ADMIN_NAV`), which is the same shell every other role uses (D4/R1).
 */
export const Route = createFileRoute('/admin/')({
  validateSearch: (search: Record<string, unknown>): { tab: AdminSectionKey } => ({
    tab: toAdminSectionKey(search?.tab),
  }),
  component: () => (
    <Protected role="admin">
      <AdminConsole />
    </Protected>
  ),
});

function AdminConsole() {
  const { token } = useAuth();
  const { tab } = Route.useSearch();
  const { toasts, push, dismiss } = useToasts();

  // The section lives in the query string, which a browser tab or history entry
  // does not show — so the document title is the one place it can say *which*
  // section is open, instead of eight entries all reading "Admin" (R44).
  useEffect(() => {
    document.title = `${ADMIN_SECTION_LABELS[tab] ?? 'Admin'} · Admin · Haven Space`;
    return () => {
      document.title = 'Haven Space';
    };
  }, [tab]);

  /**
   * Exactly one section renders (`sections[tab]`), and the `Record` keyed by
   * `AdminSectionKey` means a new section cannot be added without a body (R8).
   *
   * Section state — selection, dialogs, mutations — lives inside each section,
   * so switching sections clears it by unmounting. That is the reset the old
   * `handleTabChange` performed by hand (R10).
   */
  const sections: Record<AdminSectionKey, ReactNode> = {
    overview: <OverviewSection token={token!} />,
    users: <UsersSection token={token!} push={push} />,
    properties: <PropertiesSection token={token!} push={push} />,
    applications: <ApplicationsSection token={token!} push={push} />,
    landlords: <LandlordsSection token={token!} push={push} />,
    // Property Access owns its own query and dialogs, so it only needs the
    // shared frame around it to open like every other section (R38).
    'property-access': (
      <AdminSection section="property-access">
        <PropertyAccessTab token={token!} />
      </AdminSection>
    ),
    settings: <SettingsSection token={token!} push={push} />,
    audit: <AuditSection token={token!} />,
  };

  return (
    <RoleShell nav={ADMIN_NAV}>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
      {sections[tab]}
    </RoleShell>
  );
}
