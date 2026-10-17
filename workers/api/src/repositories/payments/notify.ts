/**
 * Payment notification inserts.
 *
 * Notification rows are written inline at each call site elsewhere in the
 * codebase; the payments feature has seven senders, so they share one helper
 * instead of copy-pasting the INSERT seven times.
 */
export interface PaymentNotificationInput {
  userId: number;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function insertNotification(
  db: D1Database,
  input: PaymentNotificationInput
): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.userId,
      input.type,
      input.title,
      input.message,
      JSON.stringify(input.metadata ?? {})
    )
    .run();
}
