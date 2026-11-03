import type { Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import {
  getPublicListingDetail,
  listPublicListings,
  listSimilarPublicListings,
} from '../../repositories/listings';
import { listPopularLocations } from '../../repositories/locations';
import {
  formatListingDetail,
  formatPopularLocation,
  formatPublicProperty,
  formatSimilarProperty,
  parseLimit,
  publicListingFilters,
} from './shared';

export async function handlePublicRooms(c: Context<{ Bindings: Env }>) {
  const filters = publicListingFilters(new URL(c.req.url));
  const result = await listPublicListings(requireD1(c.env), filters);

  return jsonResponse({
    data: {
      properties: result.properties.map(property =>
        formatPublicProperty(
          property,
          result.amenities.get(Number(property.id)) ?? [],
          result.propertyPhotos.get(Number(property.id)) ?? [],
          result.rooms.get(Number(property.id)) ?? [],
          result.roomPhotos
        )
      ),
      total_count: result.totalCount,
      limit: filters.limit,
      offset: filters.offset,
    },
  });
}

export async function handleRoomDetail(c: Context<{ Bindings: Env }>) {
  const propertyId = Number.parseInt(c.req.query('id') ?? '', 10);

  if (!Number.isFinite(propertyId)) {
    return errorResponse(400, 'Property ID is required');
  }

  const detail = await getPublicListingDetail(requireD1(c.env), propertyId);

  if (!detail) {
    return errorResponse(404, 'Property not found');
  }

  return jsonResponse({
    data: formatListingDetail(
      detail.property,
      detail.amenities,
      detail.propertyPhotos,
      detail.rooms,
      detail.roomPhotos,
      detail.landlordProperties
    ),
  });
}

export async function handleSimilarRooms(c: Context<{ Bindings: Env }>) {
  const propertyId = Number.parseInt(c.req.query('id') ?? '', 10);

  if (!Number.isFinite(propertyId)) {
    return errorResponse(400, 'Property ID is required');
  }

  const limit = Math.max(parseLimit(c.req.query('limit') ?? null, 3, 10), 1);
  const properties = await listSimilarPublicListings(requireD1(c.env), propertyId, limit);

  if (!properties) {
    return errorResponse(404, 'Property not found');
  }

  return jsonResponse({
    data: properties.map(formatSimilarProperty),
  });
}

export async function handlePopularLocations(c: Context<{ Bindings: Env }>) {
  const limit = parseLimit(c.req.query('limit') ?? null, 6, 20);
  const locations = await listPopularLocations(requireD1(c.env), limit);

  return jsonResponse({
    data: {
      locations: locations.map(formatPopularLocation).slice(0, limit),
    },
  });
}
