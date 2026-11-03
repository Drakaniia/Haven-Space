import { Hono, type Context } from 'hono';

import type { Env } from '../../env';
import { requireD1 } from '../../lib/d1';
import { errorResponse, jsonResponse } from '../../lib/http';
import { readJsonObject, type JsonRecord } from '../../lib/validation';
import {
  createManualBoarderApplication,
  createManualBoarderUser,
  findBoarderUserByEmail,
  findLandlordBoarderApplication,
  listLandlordBoarders,
  softDeleteLandlordBoarderApplications,
  updateBoarderApplication,
  updateBoarderRoomPricing,
  updateBoarderUser,
} from '../../repositories/landlord-boarders';
import {
  findLandlordRoomProperty,
  getLandlordManagedRoom,
} from '../../repositories/landlord-rooms';
import { finalizeDueLeaveRequests } from '../../repositories/tenancy';
import {
  dateStringFromBody,
  floatValue,
  hasBodyField,
  missingRequiredField,
  parsePositiveInt,
  positiveIntValue,
  requireLandlord,
  stringValue,
} from './shared';
async function handleListLandlordBoarders(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyId = parsePositiveInt(c.req.query('propertyId'));

  if (!propertyId) {
    return errorResponse(400, 'propertyId is required');
  }

  const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found');
  }

  // Close approved leaves whose date has arrived before listing, so an old
  // "Leaving approved" row never lingers (spec `approve-leave-request` §4.2).
  await finalizeDueLeaveRequests(db, { landlordId: user.user_id });
  const boarders = await listLandlordBoarders(db, propertyId, user.user_id);

  return jsonResponse({
    success: true,
    data: {
      boarders,
      total_count: boarders.length,
    },
  });
}

async function handleCreateLandlordBoarder(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const missing = missingRequiredField(body, [
    'property_id',
    'first_name',
    'last_name',
    'email',
    'room_id',
  ]);

  if (missing) {
    return errorResponse(400, `Missing required field: ${missing}`);
  }

  const propertyId = positiveIntValue(body.property_id);
  const roomId = positiveIntValue(body.room_id);

  if (!propertyId || !roomId) {
    return errorResponse(
      400,
      !propertyId ? 'Missing required field: property_id' : 'Missing required field: room_id'
    );
  }

  const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found');
  }

  const room = await getLandlordManagedRoom(db, roomId, propertyId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  const email = stringValue(body, 'email');
  const existingUser = await findBoarderUserByEmail(db, email);
  const boarderUserId =
    existingUser?.id ??
    (await createManualBoarderUser(db, {
      firstName: stringValue(body, 'first_name'),
      lastName: stringValue(body, 'last_name'),
      email,
    }));

  await createManualBoarderApplication(db, {
    boarderId: boarderUserId,
    landlordId: user.user_id,
    roomId,
    moveInDate: dateStringFromBody(body, 'move_in_date'),
  });

  return jsonResponse(
    {
      success: true,
      data: {
        message: 'Boarder added successfully',
        boarder_id: boarderUserId,
      },
    },
    201
  );
}

async function handleUpdateLandlordBoarder(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const body = await readJsonObject(c.req.raw);
  const missing = missingRequiredField(body, [
    'id',
    'property_id',
    'first_name',
    'last_name',
    'email',
    'room_id',
  ]);

  if (missing) {
    return errorResponse(400, `Missing required field: ${missing}`);
  }

  const boarderUserId = positiveIntValue(body.id);
  const propertyId = positiveIntValue(body.property_id);
  const roomId = positiveIntValue(body.room_id);

  if (!boarderUserId || !propertyId || !roomId) {
    const field = !boarderUserId ? 'id' : !propertyId ? 'property_id' : 'room_id';
    return errorResponse(400, `Missing required field: ${field}`);
  }

  const property = await findLandlordRoomProperty(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(404, 'Property not found');
  }

  const application = await findLandlordBoarderApplication(
    db,
    boarderUserId,
    user.user_id,
    propertyId
  );

  if (!application) {
    return errorResponse(404, 'Boarder not found');
  }

  const room = await getLandlordManagedRoom(db, roomId, propertyId, user.user_id);

  if (!room) {
    return errorResponse(404, 'Room not found or access denied');
  }

  await updateBoarderUser(db, boarderUserId, {
    firstName: stringValue(body, 'first_name'),
    lastName: stringValue(body, 'last_name'),
    email: stringValue(body, 'email'),
  });
  await updateBoarderApplication(
    db,
    Number(application.id),
    roomId,
    dateStringFromBody(body, 'move_in_date')
  );
  await updateBoarderRoomPricing(
    db,
    roomId,
    propertyId,
    hasBodyField(body, 'rent') ? floatValue(body.rent) : 0,
    hasBodyField(body, 'deposit') ? floatValue(body.deposit) : 0
  );

  return jsonResponse({
    success: true,
    data: {
      message: 'Boarder updated successfully',
      boarder_id: boarderUserId,
    },
  });
}

async function handleDeleteLandlordBoarder(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const boarderUserId = parsePositiveInt(c.req.query('id'));

  if (!boarderUserId) {
    return errorResponse(400, 'Boarder id is required');
  }

  const changes = await softDeleteLandlordBoarderApplications(db, boarderUserId, user.user_id);

  if (changes === 0) {
    return errorResponse(404, 'Boarder not found');
  }

  return jsonResponse({
    success: true,
    data: {
      message: 'Boarder removed successfully',
    },
  });
}

const boardersRoutes = new Hono<{ Bindings: Env }>();

boardersRoutes.get('/boarders', handleListLandlordBoarders);
boardersRoutes.post('/boarders', handleCreateLandlordBoarder);
boardersRoutes.put('/boarders', handleUpdateLandlordBoarder);
boardersRoutes.delete('/boarders', handleDeleteLandlordBoarder);

export default boardersRoutes;
