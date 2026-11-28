import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject, type JsonRecord } from '../../lib/validation';
import {
  AmenityRuleError,
  type AmenityBillingModel,
  type CreatePaidAmenityInput,
  approveTenancyAmenity,
  assignTenancyAmenity,
  cancelTenancyAmenity,
  createPaidAmenities,
  listBoarderAmenities,
  listLandlordPropertyAmenities,
  logAmenityUsage,
  rejectTenancyAmenity,
  requestBoarderAmenity,
  requestBoarderAmenityUsage,
  reviewAmenityUsage,
  updatePaidAmenity,
  updateTenancyAmenity,
} from '../../repositories/payments';

import {
  isoDate,
  landlordUser,
  nonNegativeNumber,
  positiveNumber,
  requireBoarder,
  routeId,
  trimmed,
} from './shared';

const BILLING_MODELS = new Set<AmenityBillingModel>(['monthly', 'per_use', 'one_time']);

function handleAmenityError(error: unknown): Response {
  if (error instanceof AmenityRuleError) {
    return errorResponse(error.status, error.message, { code: error.code });
  }

  throw error;
}

function parseAmenityItem(record: JsonRecord): CreatePaidAmenityInput | string {
  const name = trimmed(record, 'name');
  const billingModel = trimmed(record, 'billing_model') as AmenityBillingModel;
  const isIncluded = Boolean(record.is_included);
  const price = isIncluded ? 0 : nonNegativeNumber(record.price);

  if (!name) {
    return 'Amenity name is required';
  }

  if (!BILLING_MODELS.has(billingModel)) {
    return 'billing_model must be monthly, per_use, or one_time';
  }

  if (price === null) {
    return 'price must be zero or positive';
  }

  let maxSlots: number | null = null;

  if (record.max_slots !== undefined && record.max_slots !== null && record.max_slots !== '') {
    const parsedSlots = positiveNumber(record.max_slots);

    if (parsedSlots === null) {
      return 'max_slots must be a positive integer';
    }

    maxSlots = Math.round(parsedSlots);
  }

  return {
    name,
    description: trimmed(record, 'description') || null,
    icon: trimmed(record, 'icon') || 'sparkles',
    billing_model: billingModel,
    price,
    unit_label: trimmed(record, 'unit_label') || 'unit',
    is_metered: Boolean(record.is_metered),
    is_included: isIncluded,
    max_slots: maxSlots,
    allow_boarder_request:
      record.allow_boarder_request !== undefined ? Boolean(record.allow_boarder_request) : true,
  };
}

function optionalIsoDate(body: JsonRecord, field: string): string | null | undefined {
  const raw = trimmed(body, field);

  if (!raw) {
    return undefined;
  }

  const parsed = isoDate(raw);

  return parsed ?? null;
}

export function registerAmenityRoutes(router: Hono<{ Bindings: Env }>) {
  router.get('/api/landlord/payments/amenities', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const propertyId = routeId(c.req.query('propertyId'));

    if (!propertyId) {
      return errorResponse(400, 'propertyId is required');
    }

    const data = await listLandlordPropertyAmenities(db, propertyId, user.user_id);

    if (!data) {
      return errorResponse(404, 'Property not found');
    }

    return jsonResponse({ success: true, data });
  });

  router.post('/api/landlord/properties/:propertyId/amenities', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const propertyId = routeId(c.req.param('propertyId'));

    if (!propertyId) {
      return errorResponse(404, 'Property not found');
    }

    const body = await readJsonObject(c.req.raw);
    const rawItems = Array.isArray(body.items) ? (body.items as JsonRecord[]) : [body];

    if (rawItems.length === 0) {
      return errorResponse(400, 'Provide at least one amenity item');
    }

    const parsed: CreatePaidAmenityInput[] = [];

    for (const item of rawItems) {
      const result = parseAmenityItem(item);

      if (typeof result === 'string') {
        return errorResponse(400, result);
      }

      parsed.push(result);
    }

    const created = await createPaidAmenities(db, propertyId, user.user_id, parsed);

    if (!created) {
      return errorResponse(404, 'Property not found');
    }

    return jsonResponse({ success: true, data: created }, 201);
  });

  router.patch('/api/landlord/payments/amenities/:amenityId', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const amenityId = routeId(c.req.param('amenityId'));

    if (!amenityId) {
      return errorResponse(404, 'Amenity not found');
    }

    const body = await readJsonObject(c.req.raw);
    const patch: Partial<CreatePaidAmenityInput> & { is_active?: boolean } = {};

    if (body.name !== undefined) {
      const name = trimmed(body, 'name');

      if (!name) return errorResponse(400, 'Amenity name cannot be empty');
      patch.name = name;
    }

    if (body.description !== undefined) {
      patch.description = trimmed(body, 'description') || null;
    }

    if (body.icon !== undefined) {
      patch.icon = trimmed(body, 'icon') || 'sparkles';
    }

    if (body.billing_model !== undefined) {
      const model = trimmed(body, 'billing_model') as AmenityBillingModel;

      if (!BILLING_MODELS.has(model)) {
        return errorResponse(400, 'billing_model must be monthly, per_use, or one_time');
      }

      patch.billing_model = model;
    }

    if (body.price !== undefined) {
      const price = nonNegativeNumber(body.price);

      if (price === null) return errorResponse(400, 'price must be zero or positive');
      patch.price = price;
    }

    if (body.unit_label !== undefined) {
      patch.unit_label = trimmed(body, 'unit_label') || 'unit';
    }

    if (body.is_metered !== undefined) patch.is_metered = Boolean(body.is_metered);
    if (body.is_included !== undefined) patch.is_included = Boolean(body.is_included);
    if (body.allow_boarder_request !== undefined) {
      patch.allow_boarder_request = Boolean(body.allow_boarder_request);
    }

    if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);

    if (body.max_slots !== undefined) {
      if (body.max_slots === null || body.max_slots === '') {
        patch.max_slots = null;
      } else {
        const slots = positiveNumber(body.max_slots);

        if (slots === null) return errorResponse(400, 'max_slots must be a positive integer');
        patch.max_slots = Math.round(slots);
      }
    }

    const updated = await updatePaidAmenity(db, amenityId, user.user_id, patch);

    if (!updated) {
      return errorResponse(404, 'Amenity not found');
    }

    return jsonResponse({ success: true, data: updated });
  });

  router.post('/api/landlord/properties/:propertyId/amenities/:amenityId/assign', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const propertyId = routeId(c.req.param('propertyId'));
    const amenityId = routeId(c.req.param('amenityId'));

    if (!propertyId || !amenityId) {
      return errorResponse(404, 'Amenity not found');
    }

    const body = await readJsonObject(c.req.raw);
    const applicationId = routeId(String(body.application_id ?? ''));
    const dueDate = optionalIsoDate(body, 'due_date');

    if (!applicationId) {
      return errorResponse(400, 'application_id is required');
    }

    if (dueDate === null) {
      return errorResponse(400, 'due_date must be YYYY-MM-DD');
    }

    const quantity =
      body.quantity !== undefined ? (positiveNumber(body.quantity) ?? 0) : 1;

    if (quantity <= 0) {
      return errorResponse(400, 'quantity must be positive');
    }

    try {
      const assigned = await assignTenancyAmenity(db, propertyId, amenityId, user.user_id, {
        application_id: applicationId,
        quantity,
        due_date: dueDate ?? null,
        notes: trimmed(body, 'notes') || null,
      });

      return jsonResponse({ success: true, data: assigned }, 201);
    } catch (error) {
      return handleAmenityError(error);
    }
  });

  router.post('/api/landlord/payments/amenities/requests/:subscriptionId/approve', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const subscriptionId = routeId(c.req.param('subscriptionId'));

    if (!subscriptionId) {
      return errorResponse(404, 'Request not found');
    }

    const body = await readJsonObject(c.req.raw);
    const dueDate = optionalIsoDate(body, 'due_date');

    if (dueDate === null) {
      return errorResponse(400, 'due_date must be YYYY-MM-DD');
    }

    try {
      const approved = await approveTenancyAmenity(db, subscriptionId, user.user_id, dueDate);

      return jsonResponse({ success: true, data: approved });
    } catch (error) {
      return handleAmenityError(error);
    }
  });

  router.post('/api/landlord/payments/amenities/requests/:subscriptionId/reject', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const subscriptionId = routeId(c.req.param('subscriptionId'));

    if (!subscriptionId) {
      return errorResponse(404, 'Request not found');
    }

    const body = await readJsonObject(c.req.raw);

    try {
      const rejected = await rejectTenancyAmenity(
        db,
        subscriptionId,
        user.user_id,
        trimmed(body, 'reason') || null
      );

      return jsonResponse({ success: true, data: rejected });
    } catch (error) {
      return handleAmenityError(error);
    }
  });

  router.patch('/api/landlord/payments/amenities/subscriptions/:subscriptionId', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const subscriptionId = routeId(c.req.param('subscriptionId'));

    if (!subscriptionId) {
      return errorResponse(404, 'Subscription not found');
    }

    const body = await readJsonObject(c.req.raw);
    const patch: { unit_price_snapshot?: number; quantity?: number } = {};

    if (body.unit_price_snapshot !== undefined) {
      const price = nonNegativeNumber(body.unit_price_snapshot);

      if (price === null) return errorResponse(400, 'unit_price_snapshot must be zero or positive');
      patch.unit_price_snapshot = price;
    }

    if (body.quantity !== undefined) {
      const qty = positiveNumber(body.quantity);

      if (qty === null) return errorResponse(400, 'quantity must be positive');
      patch.quantity = qty;
    }

    try {
      const updated = await updateTenancyAmenity(db, subscriptionId, user.user_id, patch);

      return jsonResponse({ success: true, data: updated });
    } catch (error) {
      return handleAmenityError(error);
    }
  });

  router.post('/api/landlord/payments/amenities/subscriptions/:subscriptionId/cancel', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const subscriptionId = routeId(c.req.param('subscriptionId'));

    if (!subscriptionId) {
      return errorResponse(404, 'Subscription not found');
    }

    try {
      const cancelled = await cancelTenancyAmenity(db, subscriptionId, {
        role: 'landlord',
        userId: user.user_id,
      });

      return jsonResponse({ success: true, data: cancelled });
    } catch (error) {
      return handleAmenityError(error);
    }
  });

  router.post('/api/landlord/properties/:propertyId/amenities/:amenityId/usage', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const propertyId = routeId(c.req.param('propertyId'));
    const amenityId = routeId(c.req.param('amenityId'));

    if (!propertyId || !amenityId) {
      return errorResponse(404, 'Amenity not found');
    }

    const body = await readJsonObject(c.req.raw);
    const appIds = Array.isArray(body.application_ids)
      ? body.application_ids
          .map(value => routeId(String(value)))
          .filter((value): value is number => value !== null)
      : body.application_id !== undefined
        ? [routeId(String(body.application_id))].filter((value): value is number => value !== null)
        : [];

    if (appIds.length === 0) {
      return errorResponse(400, 'Choose at least one active tenancy');
    }

    const dueDate = optionalIsoDate(body, 'due_date');
    const usageDate = optionalIsoDate(body, 'usage_date');

    if (dueDate === null || usageDate === null) {
      return errorResponse(400, 'Dates must be YYYY-MM-DD');
    }

    try {
      const logs = await logAmenityUsage(db, propertyId, amenityId, user.user_id, {
        application_ids: appIds,
        quantity: body.quantity !== undefined ? Number(body.quantity) : null,
        previous_reading:
          body.previous_reading !== undefined && body.previous_reading !== null && body.previous_reading !== ''
            ? Number(body.previous_reading)
            : null,
        current_reading:
          body.current_reading !== undefined && body.current_reading !== null && body.current_reading !== ''
            ? Number(body.current_reading)
            : null,
        due_date: dueDate ?? null,
        usage_date: usageDate ?? null,
        notes: trimmed(body, 'notes') || null,
      });

      return jsonResponse({ success: true, data: logs }, 201);
    } catch (error) {
      return handleAmenityError(error);
    }
  });

  router.post('/api/landlord/payments/amenities/usage/:logId/approve', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const logId = routeId(c.req.param('logId'));

    if (!logId) {
      return errorResponse(404, 'Usage request not found');
    }

    const body = await readJsonObject(c.req.raw);
    const dueDate = optionalIsoDate(body, 'due_date');

    if (dueDate === null) {
      return errorResponse(400, 'due_date must be YYYY-MM-DD');
    }

    try {
      const posted = await reviewAmenityUsage(db, logId, user.user_id, 'approve', {
        due_date: dueDate ?? null,
      });

      return jsonResponse({ success: true, data: posted });
    } catch (error) {
      return handleAmenityError(error);
    }
  });

  router.post('/api/landlord/payments/amenities/usage/:logId/reject', async c => {
    const db = requireD1(c.env);
    const user = await landlordUser(c);

    if (user instanceof Response) {
      return user;
    }

    const logId = routeId(c.req.param('logId'));

    if (!logId) {
      return errorResponse(404, 'Usage request not found');
    }

    const body = await readJsonObject(c.req.raw);

    try {
      const rejected = await reviewAmenityUsage(db, logId, user.user_id, 'reject', {
        reason: trimmed(body, 'reason') || null,
      });

      return jsonResponse({ success: true, data: rejected });
    } catch (error) {
      return handleAmenityError(error);
    }
  });

  // ------------------------------------------------------------------ boarder

  router.get('/api/boarder/payments/amenities', async c => {
    const db = requireD1(c.env);
    const user = await requireBoarder(c);
    const data = await listBoarderAmenities(db, user.user_id);

    if (!data) {
      return errorResponse(403, 'Confirmed tenancy required', { code: 'no_tenancy' });
    }

    return jsonResponse({ success: true, data });
  });

  router.post('/api/boarder/payments/amenities/:amenityId/request', async c => {
    const db = requireD1(c.env);
    const user = await requireBoarder(c);
    const amenityId = routeId(c.req.param('amenityId'));

    if (!amenityId) {
      return errorResponse(404, 'Amenity not found');
    }

    const body = await readJsonObject(c.req.raw);
    const quantity =
      body.quantity !== undefined ? (positiveNumber(body.quantity) ?? 0) : 1;

    if (quantity <= 0) {
      return errorResponse(400, 'quantity must be positive');
    }

    try {
      const requested = await requestBoarderAmenity(db, amenityId, user.user_id, {
        quantity,
        notes: trimmed(body, 'notes') || null,
      });

      return jsonResponse({ success: true, data: requested }, 201);
    } catch (error) {
      return handleAmenityError(error);
    }
  });

  router.post('/api/boarder/payments/amenities/:amenityId/usage-request', async c => {
    const db = requireD1(c.env);
    const user = await requireBoarder(c);
    const amenityId = routeId(c.req.param('amenityId'));

    if (!amenityId) {
      return errorResponse(404, 'Amenity not found');
    }

    const body = await readJsonObject(c.req.raw);
    const quantity = positiveNumber(body.quantity);
    const usageDate = optionalIsoDate(body, 'usage_date');

    if (quantity === null) {
      return errorResponse(400, 'quantity must be greater than zero');
    }

    if (usageDate === null) {
      return errorResponse(400, 'usage_date must be YYYY-MM-DD');
    }

    try {
      const requested = await requestBoarderAmenityUsage(db, amenityId, user.user_id, {
        quantity,
        usage_date: usageDate ?? null,
        notes: trimmed(body, 'notes') || null,
      });

      return jsonResponse({ success: true, data: requested }, 201);
    } catch (error) {
      return handleAmenityError(error);
    }
  });

  router.post('/api/boarder/payments/amenities/subscriptions/:subscriptionId/cancel', async c => {
    const db = requireD1(c.env);
    const user = await requireBoarder(c);
    const subscriptionId = routeId(c.req.param('subscriptionId'));

    if (!subscriptionId) {
      return errorResponse(404, 'Subscription not found');
    }

    try {
      const cancelled = await cancelTenancyAmenity(db, subscriptionId, {
        role: 'boarder',
        userId: user.user_id,
      });

      return jsonResponse({ success: true, data: cancelled });
    } catch (error) {
      return handleAmenityError(error);
    }
  });
}
