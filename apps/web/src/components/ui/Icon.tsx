const ICON_FILES: Record<string, string> = {
  home: 'dashboard.svg',
  chat: 'messages.svg',
  announcement: 'announcement.svg',
  notification: 'notification.svg',
  shield: 'shield.svg',
  payment: 'payment.svg',
  search: 'search.svg',
  settings: 'settings.svg',
  cog: 'settings.svg',
  calendar: 'calendar.svg',
  map: 'maps.svg',
  analytics: 'analytics.svg',
  chartBar: 'analytics.svg',
  list: 'property.svg',
  application: 'applications.svg',
  clipboardList: 'applications.svg',
  document: 'document.svg',
  book: 'handbook.svg',
  users: 'users.svg',
  shieldCheck: 'verified.svg',
  buildingOffice: 'property.svg',
  flag: 'report.svg',
  chevronDown: 'chevron-down.svg',
  chevronLeft: 'chevron-left.svg',
  chevronRight: 'chevron-right.svg',
  logout: 'logout.svg',
  user: 'user.svg',
  arrowRight: 'chevron-right.svg',
  view: 'viewicon.svg',
  google: 'google-icon-logo.svg',
  location: 'location.svg',
  pin: 'LocationPin.svg',
  bookmark: 'bookmark.svg',
  currencyDollar: 'currencyDollar.svg',
  calendarDays: 'calendar.svg',
  userCircle: 'user.svg',
  target: 'location.svg',
  building: 'building.svg',
  banknotes: 'currencyDollar.svg',
  kitchen: 'Kitchen.svg',
  toilet: 'Toilet.svg',
  laundry: 'Laundry.svg',
  aircon: 'aircon.svg',
  cctv: 'cctv.svg',
  parking: 'parking.svg',
  furnished: 'furnished.svg',
  wifi: 'wfifi.svg',
  clock: 'clock.svg',
  check: 'check.svg',
  close: 'close.svg',
  plus: 'plus.svg',
  minus: 'minus.svg',
  eye: 'eye.svg',
  eyeOff: 'viewicon.svg',
  edit: 'camera.svg',
  photo: 'photo.svg',
  sparkles: 'sparkles.svg',
  lightbulb: 'lightbulb.svg',
  history: 'history.svg',
  export: 'export.svg',
  printer: 'printer.svg',
  grid: 'grid2x2.svg',
  report: 'report.svg',
};

/** Brand marks keep their own colours; everything else is a monochrome glyph. */
const MULTICOLOUR = new Set(['google']);

/**
 * App icon.
 *
 * The glyph SVGs are single-colour (with opacity layers for a duotone look), so
 * they render as a CSS mask filled with `currentColor`: an icon takes the text
 * colour of whatever it sits in (`text-primary`, `text-white` on a solid
 * button, `text-error-ink` in a banner) instead of a baked-in grey. Brand marks
 * in `MULTICOLOUR` stay plain images.
 */
export function Icon({
  name,
  size = 20,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const file = ICON_FILES[name];
  if (!file) return null;
  const src = `/assets/svg/${file}`;

  if (MULTICOLOUR.has(name)) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
      />
    );
  }

  const mask = `url("${src}") center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      data-icon={name}
      className={`inline-block shrink-0 bg-current align-middle ${className}`}
      style={{ width: size, height: size, mask, WebkitMask: mask }}
    />
  );
}
