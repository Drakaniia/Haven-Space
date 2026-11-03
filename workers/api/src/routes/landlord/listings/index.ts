import { Hono } from 'hono';

import type { Env } from '../../../env';
import { handleCreateLandlordPropertyAlias, handleCreateListing } from './create';
import { handleUploadListingPhotos, handleUploadTemporaryPropertyPhotos } from './photos';
import { handleUpdateListing } from './update';

const listingsRoutes = new Hono<{ Bindings: Env }>();

listingsRoutes.post('/listings', handleCreateListing);
listingsRoutes.put('/listings/:id', handleUpdateListing);
listingsRoutes.post('/upload-photos', handleUploadTemporaryPropertyPhotos);
listingsRoutes.post('/listings/:id/photos', handleUploadListingPhotos);
listingsRoutes.post('/properties', handleCreateLandlordPropertyAlias);

export default listingsRoutes;
