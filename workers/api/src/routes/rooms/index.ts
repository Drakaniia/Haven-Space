import { Hono } from 'hono';

import type { Env } from '../../env';
import {
  handlePopularLocations,
  handlePublicRooms,
  handleRoomDetail,
  handleSimilarRooms,
} from './listings';

const roomsRoutes = new Hono<{ Bindings: Env }>();

roomsRoutes.get('/api/rooms/public', handlePublicRooms);
roomsRoutes.get('/api/rooms/detail', handleRoomDetail);
roomsRoutes.get('/api/rooms/similar', handleSimilarRooms);
roomsRoutes.get('/api/rooms/popular-locations', handlePopularLocations);

export default roomsRoutes;
