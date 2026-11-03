import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject } from '../../lib/validation';
import {
  allowedAdminSettingKeys,
  getAdminSettings,
  upsertAdminSetting,
} from '../../repositories/admin-dashboard';
import { requireAdmin } from './shared';

async function handleAdminSettings(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  return jsonResponse({ data: await getAdminSettings(db) });
}

async function handleUpdateAdminSettings(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireAdmin(c);

  if (!user) {
    return errorResponse(403, 'Access denied. Admins only.');
  }

  const body = await readJsonObject(c.req.raw);

  if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) {
    return errorResponse(400, 'Missing or invalid settings object');
  }

  for (const [key, value] of Object.entries(body.settings)) {
    if (!allowedAdminSettingKeys.includes(key)) {
      continue;
    }

    await upsertAdminSetting(db, key, String(value ?? ''));
  }

  return jsonResponse({ message: 'Settings updated successfully' });
}

export function registerSettingsRoutes(router: Hono<{ Bindings: Env }>) {
  router.get('/api/admin/settings', handleAdminSettings);
  router.patch('/api/admin/settings', handleUpdateAdminSettings);
}
