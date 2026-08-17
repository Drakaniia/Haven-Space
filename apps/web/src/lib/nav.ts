export interface NavItem {
  to: string;
  label: string;
  icon: string;
  group: string;
}

export const BOARDER_NAV: NavItem[] = [
  { to: '/boarder', label: 'Dashboard', icon: 'home', group: 'Main' },
  { to: '/boarder/tenancy', label: 'My Tenancy', icon: 'document', group: 'Main' },
  { to: '/boarder/applications', label: 'Applications', icon: 'application', group: 'Main' },
  { to: '/boarder/find-a-room', label: 'Find a Room', icon: 'search', group: 'Discovery' },
  { to: '/boarder/messages', label: 'Messages', icon: 'chat', group: 'Communication' },
  {
    to: '/boarder/announcements',
    label: 'Announcements',
    icon: 'announcement',
    group: 'Communication',
  },
  { to: '/boarder/payments', label: 'Payments', icon: 'payment', group: 'Payments' },
  { to: '/boarder/house-rules', label: 'House Rules', icon: 'book', group: 'Info' },
  { to: '/boarder/settings', label: 'Settings', icon: 'settings', group: 'Account' },
];

export const LANDLORD_NAV: NavItem[] = [
  { to: '/landlord', label: 'Dashboard', icon: 'home', group: 'Main' },
  { to: '/landlord/listings', label: 'My Listings', icon: 'list', group: 'Main' },
  { to: '/landlord/properties', label: 'Properties', icon: 'buildingOffice', group: 'Main' },
  { to: '/landlord/maps', label: 'Map View', icon: 'map', group: 'Main' },
  { to: '/landlord/invitations', label: 'Invitations', icon: 'document', group: 'Main' },
  { to: '/landlord/applications', label: 'Applications', icon: 'application', group: 'Main' },
  { to: '/landlord/boarders', label: 'Tenants', icon: 'users', group: 'Main' },
  { to: '/landlord/messages', label: 'Messages', icon: 'chat', group: 'Communication' },
  { to: '/landlord/payments', label: 'Payments', icon: 'payment', group: 'Payments' },
  {
    to: '/landlord/announcements',
    label: 'Announcements',
    icon: 'announcement',
    group: 'Communication',
  },
  { to: '/landlord/calendar', label: 'Calendar', icon: 'calendar', group: 'Management' },
  { to: '/landlord/activity', label: 'Activity', icon: 'analytics', group: 'Management' },
  { to: '/landlord/pricing', label: 'Pricing', icon: 'flag', group: 'Management' },
  { to: '/landlord/settings', label: 'Settings', icon: 'settings', group: 'Account' },
];

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: 'home', group: 'Operations' },
];
