import type { Context } from 'hono';

import type { Env } from '../../../env';
import { requireD1 } from '../../../lib/d1';
import { errorResponse, jsonResponse } from '../../../lib/http';
import { uploadFilesToUploadThing } from '../../../lib/uploadthing';
import {
  createLandlordPropertyPhoto,
  findAccessibleLandlordPropertyIdentity,
  getMaxPropertyPhotoDisplayOrder,
} from '../../../repositories/landlord-properties';
import {
  fileExtension,
  listingPhotoFiles,
  maxPhotoSizeBytes,
  parsePositiveInt,
  requireLandlord,
  temporaryPropertyPhotoFiles,
} from '../shared';
import { allowedPhotoExtensions } from './drafts';

export async function handleUploadTemporaryPropertyPhotos(c: Context<{ Bindings: Env }>) {
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  let formData: FormData;

  try {
    formData = await c.req.raw.formData();
  } catch {
    return errorResponse(400, 'No photos provided');
  }

  const files = temporaryPropertyPhotoFiles(formData);

  if (files.length === 0) {
    return errorResponse(400, 'No photos provided');
  }

  const validFiles = files.filter(file => {
    const extension = fileExtension(file.name);

    return allowedPhotoExtensions.has(extension) && file.size <= maxPhotoSizeBytes;
  });

  if (validFiles.length === 0) {
    return errorResponse(400, 'Failed to upload photos');
  }

  const uploadResults = await uploadFilesToUploadThing(c.env, validFiles, {
    landlordId: user.user_id,
    route: 'landlord-temporary-property-photos',
  });
  const uploadedPhotos = uploadResults
    .map(result => result.data?.ufsUrl ?? result.data?.url ?? result.data?.appUrl ?? null)
    .filter((url): url is string => Boolean(url));

  if (uploadedPhotos.length === 0) {
    return errorResponse(
      400,
      uploadResults.find(result => result.error)?.error?.message || 'Failed to upload photos'
    );
  }

  return jsonResponse({
    message: 'Photos uploaded successfully',
    data: {
      urls: uploadedPhotos,
    },
  });
}

export async function handleUploadListingPhotos(c: Context<{ Bindings: Env }>) {
  const db = requireD1(c.env);
  const user = await requireLandlord(c);

  if (user instanceof Response) {
    return user;
  }

  const propertyId = parsePositiveInt(c.req.param('id'));

  if (!propertyId) {
    return errorResponse(400, 'Invalid property ID');
  }

  const property = await findAccessibleLandlordPropertyIdentity(db, propertyId, user.user_id);

  if (!property) {
    return errorResponse(403, 'Property not found or access denied');
  }

  let formData: FormData;

  try {
    formData = await c.req.raw.formData();
  } catch {
    return errorResponse(400, 'No photos provided');
  }

  const files = listingPhotoFiles(formData);

  if (files.length === 0) {
    return errorResponse(400, 'No photos provided');
  }

  const maxOrder = await getMaxPropertyPhotoDisplayOrder(db, propertyId);
  const validFiles = files.filter(file => {
    const extension = fileExtension(file.name);

    return allowedPhotoExtensions.has(extension) && file.size <= maxPhotoSizeBytes;
  });

  if (validFiles.length === 0) {
    return errorResponse(
      400,
      'Failed to upload photos. Check file types and sizes (max 5 MB, jpg/png/webp/gif).'
    );
  }

  const uploadResults = await uploadFilesToUploadThing(c.env, validFiles, {
    landlordId: user.user_id,
    propertyId,
    route: 'landlord-listing-photos',
  });
  const uploadedPhotos = uploadResults
    .map(result => result.data?.ufsUrl ?? result.data?.url ?? result.data?.appUrl ?? null)
    .filter((url): url is string => Boolean(url));

  if (uploadedPhotos.length === 0) {
    return errorResponse(
      400,
      uploadResults.find(result => result.error)?.error?.message ||
        'Failed to upload photos. Check file types and sizes (max 5 MB, jpg/png/webp/gif).'
    );
  }

  for (const [index, photoUrl] of uploadedPhotos.entries()) {
    const displayOrder = maxOrder + 1 + index;
    const isCover = maxOrder === -1 && index === 0 ? 1 : 0;
    await createLandlordPropertyPhoto(db, propertyId, photoUrl, isCover, displayOrder);
  }

  return jsonResponse({
    message: 'Photos uploaded successfully',
    data: {
      urls: uploadedPhotos,
    },
  });
}
