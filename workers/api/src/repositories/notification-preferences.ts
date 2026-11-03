/**
 * Per-user notification toggles (spec `settings-signin-method` §6–§7).
 *
 * A missing row means the defaults below. The same values are the SQL column
 * defaults in migration `0023_settings_preferences`, so the implicit and
 * materialized states can never disagree.
 *
 * Only three notification types are mutable; everything else (payments,
 * property access, landlord verification) is always delivered and returns
 * `null` from `notificationCategory()`.
 */
export type NotificationPreferenceKey = 'application_updates' | 'messages' | 'announcements';

export interface NotificationPreferences {
  application_updates: boolean;
  messages: boolean;
  announcements: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  application_updates: true,
  messages: true,
  announcements: false,
};

const PREFERENCE_COLUMNS: Record<NotificationPreferenceKey, string> = {
  application_updates: 'application_updates',
  messages: 'messages',
  announcements: 'announcements',
};

const APPLICATION_UPDATE_TYPES = new Set([
  'new_application',
  'application_accepted',
  'application_rejected',
  'booking_confirmed',
]);

/**
 * Which toggle owns a notification type, or `null` when it is always delivered.
 * Application types have no writer yet — the mapping is here so the toggle goes
 * live the moment one is added.
 */
export function notificationCategory(type: string): NotificationPreferenceKey | null {
  if (APPLICATION_UPDATE_TYPES.has(type)) {
    return 'application_updates';
  }

  if (type === 'message') {
    return 'messages';
  }

  if (type === 'announcement') {
    return 'announcements';
  }

  return null;
}

interface NotificationPreferenceRow {
  application_updates: number;
  messages: number;
  announcements: number;
}

export async function findNotificationPreferences(
  db: D1Database,
  userId: number
): Promise<NotificationPreferences> {
  const row = await db
    .prepare(
      `
        SELECT application_updates, messages, announcements
        FROM notification_preferences
        WHERE user_id = ?
        LIMIT 1
      `
    )
    .bind(userId)
    .first<NotificationPreferenceRow>();

  if (!row) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  return {
    application_updates: Boolean(row.application_updates),
    messages: Boolean(row.messages),
    announcements: Boolean(row.announcements),
  };
}

export async function saveNotificationPreferences(
  db: D1Database,
  userId: number,
  preferences: NotificationPreferences
): Promise<NotificationPreferences> {
  await db
    .prepare(
      `
        INSERT INTO notification_preferences (
          user_id,
          application_updates,
          messages,
          announcements
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          application_updates = excluded.application_updates,
          messages = excluded.messages,
          announcements = excluded.announcements,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .bind(
      userId,
      preferences.application_updates ? 1 : 0,
      preferences.messages ? 1 : 0,
      preferences.announcements ? 1 : 0
    )
    .run();

  return await findNotificationPreferences(db, userId);
}

/** True when the recipient has muted the toggle that owns `type`. */
export async function isNotificationMuted(
  db: D1Database,
  userId: number,
  type: string
): Promise<boolean> {
  const category = notificationCategory(type);

  if (!category) {
    return false;
  }

  const preferences = await findNotificationPreferences(db, userId);

  return preferences[category] === false;
}

/**
 * Recipients in `userIds` who muted `key`, in one query.
 *
 * Announcements fan out per boarder; asking per recipient would double the
 * round-trips of the send. A user with no saved row gets the default for that
 * toggle — which is ON for messages/application updates and OFF for
 * announcements — so this cannot just look for explicit `0` rows.
 */
export async function mutedRecipientIds(
  db: D1Database,
  userIds: number[],
  key: NotificationPreferenceKey
): Promise<Set<number>> {
  if (userIds.length === 0) {
    return new Set();
  }

  const defaultMuted = DEFAULT_NOTIFICATION_PREFERENCES[key] === false;
  const column = PREFERENCE_COLUMNS[key];
  const placeholders = userIds.map(() => '?').join(', ');
  const result = await db
    .prepare(
      `
        SELECT user_id
        FROM notification_preferences
        WHERE ${column} = ?
          AND user_id IN (${placeholders})
      `
    )
    .bind(defaultMuted ? 1 : 0, ...userIds)
    .all<{ user_id: number }>();
  const flagged = new Set((result.results ?? []).map(row => Number(row.user_id)));

  if (!defaultMuted) {
    return flagged;
  }

  // Default off: everyone is muted except the users who explicitly enabled it.
  return new Set(userIds.filter(userId => !flagged.has(Number(userId))));
}
