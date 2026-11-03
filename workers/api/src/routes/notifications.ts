import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authenticateUser, authorizeUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import {
  countUnreadNotifications,
  deleteNotification,
  getAcceptedApplicationStatus,
  listAcceptedApplications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../repositories/notifications';
import { finalizeDueLeaveRequests } from '../repositories/tenancy';

const notificationRoutes = new Hono<{ Bindings: Env }>();

function parsePositiveId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function requireAnyUser(c: Context<{ Bindings: Env }>) {
  return authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);
}

notificationRoutes.get('/api/notifications', async c => {
  const db = requireD1(c.env);
  const user = await requireAnyUser(c);
  // The bell is one of the reconciling reads (spec `approve-leave-request` §4.2).
  await finalizeDueLeaveRequests(
    db,
    user.role === 'landlord' ? { landlordId: user.user_id } : { boarderId: user.user_id }
  );
  const notifications = await listNotifications(db, {
    userId: user.user_id,
    role: user.role,
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
  });
  const unreadCount = await countUnreadNotifications(db, user.user_id);

  return jsonResponse({
    data: notifications,
    unread_count: unreadCount,
  });
});

notificationRoutes.get('/api/notifications/unread-count', async c => {
  const db = requireD1(c.env);
  const user = await requireAnyUser(c);
  await finalizeDueLeaveRequests(
    db,
    user.role === 'landlord' ? { landlordId: user.user_id } : { boarderId: user.user_id }
  );

  return jsonResponse({
    data: {
      unread_count: await countUnreadNotifications(db, user.user_id),
    },
  });
});

notificationRoutes.patch('/api/notifications/read-all', async c => {
  const db = requireD1(c.env);
  const user = await requireAnyUser(c);

  await markAllNotificationsRead(db, user.user_id);

  return jsonResponse({ message: 'All notifications marked as read' });
});

notificationRoutes.patch('/api/notifications/:id/read', async c => {
  const db = requireD1(c.env);
  const user = await requireAnyUser(c);
  const notificationId = parsePositiveId(c.req.param('id'));

  if (!notificationId) {
    return errorResponse(404, 'Notification not found');
  }

  const changes = await markNotificationRead(db, notificationId, user.user_id);

  if (changes === 0) {
    return errorResponse(404, 'Notification not found');
  }

  return jsonResponse({ message: 'Notification marked as read' });
});

notificationRoutes.delete('/api/notifications/:id', async c => {
  const db = requireD1(c.env);
  const user = await requireAnyUser(c);
  const notificationId = parsePositiveId(c.req.param('id'));

  if (!notificationId) {
    return errorResponse(404, 'Notification not found');
  }

  const changes = await deleteNotification(db, notificationId, user.user_id);

  if (changes === 0) {
    return errorResponse(404, 'Notification not found');
  }

  return jsonResponse({ message: 'Notification deleted' });
});

notificationRoutes.get('/api/boarder/accepted-applications', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);

  return jsonResponse({ data: await listAcceptedApplications(db, user.user_id) });
});

notificationRoutes.get('/api/boarder/has-accepted-applications', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const status = await getAcceptedApplicationStatus(db, user.user_id);

  return jsonResponse({
    ...status,
    data: status,
  });
});

export default notificationRoutes;
