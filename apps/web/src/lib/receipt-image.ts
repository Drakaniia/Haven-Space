/**
 * Receipt photos straight off a phone are often 3–8MB, or HEIC, which the API
 * rejects. Re-encode anything large or unsupported as a JPEG no wider than
 * `MAX_EDGE`, so a valid screenshot can always be submitted.
 */

const SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
/** Under this size a supported file is sent untouched. */
const PASS_THROUGH_BYTES = 1.5 * 1024 * 1024;
const MAX_EDGE = 1800;
/** Matches the API's `MAX_PROOF_BYTES`. */
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export async function prepareReceiptImage(file: File): Promise<File> {
  if (SUPPORTED.has(file.type) && file.size <= PASS_THROUGH_BYTES) {
    return file;
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (SUPPORTED.has(file.type) && file.size <= MAX_RECEIPT_BYTES) {
      return file;
    }

    throw new Error(
      'This photo format could not be read. Take a screenshot, or save it as JPG or PNG and try again.'
    );
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  );

  if (!blob || blob.size > MAX_RECEIPT_BYTES) {
    throw new Error('The receipt image is too large. Please use a photo under 5MB.');
  }

  const name = `${file.name.replace(/\.[^.]*$/, '') || 'receipt'}.jpg`;

  return new File([blob], name, { type: 'image/jpeg' });
}
