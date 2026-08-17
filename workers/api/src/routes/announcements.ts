import { Hono, type Context } from 'hono';

import type { Env } from '../env';
import { authenticateUser, authorizeUser, type AuthenticatedUser } from '../lib/auth';
import { requireD1 } from '../lib/d1';
import { errorResponse, jsonResponse } from '../lib/http';
import { isJsonRecord, type JsonRecord } from '../lib/validation';
import {
  createAnnouncement,
  createAnnouncementNotifications,
  findLandlordAnnouncement,
  incrementAnnouncementView,
  listAnnouncementBoarders,
  listAnnouncementTargets,
  listBoarderAnnouncements,
  listAccessiblePropertyIds,
  listLandlordAnnouncements,
  replaceAnnouncementTargets,
  softDeleteAnnouncement,
  todayDateString,
  updateAnnouncement,
  formatLandlordAnnouncement,
} from '../repositories/announcements';

const announcementRoutes = new Hono<{ Bindings: Env }>();
const categories = new Set(['general', 'maintenance', 'urgent', 'reminder', 'event']);
const priorities = new Set(['low', 'medium', 'high']);

async function readJsonBody(request: Request): Promise<JsonRecord | null> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  return isJsonRecord(body) ? body : null;
}

function stringField(body: JsonRecord | null, field: string): string {
  const value = body?.[field];

  return typeof value === 'string' ? value.trim() : '';
}

function dateField(body: JsonRecord | null, field: string): string {
  const value = stringField(body, field);

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayDateString();
}

function routeId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseTargetProperties(body: JsonRecord | null): number[] | null {
  const value = body?.properties;

  if (!Array.isArray(value) || value.length === 0 || value.includes('all')) {
    return null;
  }

  const ids = value
    .map(item => (typeof item === 'number' ? item : Number.parseInt(String(item), 10)))
    .filter(id => Number.isFinite(id) && id > 0);

  return [...new Set(ids)];
}

async function requireLandlord(
  c: Context<{ Bindings: Env }>
): Promise<AuthenticatedUser | Response> {
  const user = await authenticateUser(requireD1(c.env), c.req.raw, c.env.JWT_SECRET);

  if (user.role !== 'landlord') {
    return errorResponse(403, 'Forbidden: You do not have permission to access this resource');
  }

  return user;
}

async function announcementInput(db: D1Database, landlordId: number, body: JsonRecord | null) {
  const title = stringField(body, 'title');
  const description = stringField(body, 'description');

  if (!title || !description) {
    return {
      response: errorResponse(400, 'Missing required fields: title, description'),
      input: null,
      targetPropertyIds: null,
    };
  }

  const requestedTargetIds = parseTargetProperties(body);
  const targetPropertyIds = requestedTargetIds
    ? await listAccessiblePropertyIds(db, landlordId, requestedTargetIds)
    : null;

  if (requestedTargetIds && targetPropertyIds?.length === 0) {
    return {
      response: errorResponse(400, 'No valid target properties selected'),
      input: null,
      targetPropertyIds: null,
    };
  }

  const category = stringField(body, 'category') || 'general';
  const priority = stringField(body, 'priority') || 'medium';

  return {
    response: null,
    input: {
      landlordId,
      title,
      description,
      category: categories.has(category) ? category : 'general',
      priority: priorities.has(priority) ? priority : 'medium',
      publishDate: dateField(body, 'publish_date'),
    },
    targetPropertyIds,
  };
}

announcementRoutes.get('/api/landlord/announcements', async c => {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const rows = await listLandlordAnnouncements(db, user.user_id);
  const targetMap = await listAnnouncementTargets(
    db,
    rows.map(row => Number(row.id))
  );
  const announcements = rows.map(row =>
    formatLandlordAnnouncement(row, targetMap.get(Number(row.id)) ?? [])
  );

  return jsonResponse({
    success: true,
    data: {
      announcements,
      total_count: announcements.length,
    },
  });
});

announcementRoutes.post('/api/landlord/announcements', async c => {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonBody(c.req.raw);
  const parsed = await announcementInput(db, user.user_id, body);

  if (parsed.response || !parsed.input) {
    return parsed.response;
  }

  const announcementId = await createAnnouncement(db, parsed.input);
  await replaceAnnouncementTargets(db, announcementId, parsed.targetPropertyIds ?? []);

  const boarderIds = await listAnnouncementBoarders(db, user.user_id, parsed.targetPropertyIds);
  await createAnnouncementNotifications(
    db,
    boarderIds,
    announcementId,
    user.user_id,
    parsed.input.title
  );

  return jsonResponse(
    {
      success: true,
      data: {
        announcement_id: announcementId,
        message: 'Announcement created successfully',
      },
    },
    201
  );
});

announcementRoutes.put('/api/landlord/announcements/:id', async c => {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const announcementId = routeId(c.req.param('id'));

  if (!announcementId) {
    return errorResponse(400, 'Announcement ID is required');
  }

  const existing = await findLandlordAnnouncement(db, announcementId, user.user_id);

  if (!existing) {
    return errorResponse(404, 'Announcement not found');
  }

  const body = await readJsonBody(c.req.raw);
  const parsed = await announcementInput(db, user.user_id, body);

  if (parsed.response || !parsed.input) {
    return parsed.response;
  }

  await updateAnnouncement(db, announcementId, parsed.input);

  if (body && 'properties' in body) {
    await replaceAnnouncementTargets(db, announcementId, parsed.targetPropertyIds ?? []);
  }

  return jsonResponse({
    success: true,
    data: {
      message: 'Announcement updated successfully',
    },
  });
});

announcementRoutes.delete('/api/landlord/announcements/:id', async c => {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const announcementId = routeId(c.req.param('id'));

  if (!announcementId) {
    return errorResponse(400, 'Announcement ID is required');
  }

  const changes = await softDeleteAnnouncement(db, announcementId, user.user_id);

  if (changes === 0) {
    return errorResponse(404, 'Announcement not found');
  }

  return jsonResponse({
    success: true,
    data: {
      message: 'Announcement deleted successfully',
    },
  });
});

announcementRoutes.get('/api/boarder/announcements', async c => {
  const db = requireD1(c.env);
  const user = await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const announcements = await listBoarderAnnouncements(db, user.user_id);

  return jsonResponse({
    success: true,
    data: {
      announcements,
      total_count: announcements.length,
    },
  });
});

announcementRoutes.post('/api/boarder/announcements/:id/view', async c => {
  const db = requireD1(c.env);
  await authorizeUser(db, c.req.raw, ['boarder'], c.env.JWT_SECRET);
  const announcementId = routeId(c.req.param('id'));

  if (!announcementId) {
    return errorResponse(400, 'Announcement ID is required');
  }

  await incrementAnnouncementView(db, announcementId);

  return jsonResponse({
    success: true,
    data: {
      message: 'Announcement marked as viewed',
    },
  });
});

export default announcementRoutes;
