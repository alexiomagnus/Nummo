// Receipt picture handling in the browser: decoding, downscaling and encoding. The picture lives only in memory for
// the duration of a scan; nothing is stored or uploaded here.
export const imageErrors = {
  format: 'Formato non supportato: usa una foto JPEG, PNG o WebP.',
  size: 'Immagine troppo grande: usa un file sotto i 25 MB.',
} as const;

const maxBytes = 25 * 1024 * 1024;
// Longest side kept for reading: enough for small print, light enough for a phone and for an upload.
const maxSide = 2000;

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch { /* older browsers or a format only <img> can read */ }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => {} };
  } catch { throw new Error(imageErrors.format); } finally { URL.revokeObjectURL(url); }
}

// The chosen file as an upright JPEG no larger than needed. Rejects with a source-language message.
export async function prepareImage(file: Blob): Promise<Blob> {
  if (file.type && !file.type.startsWith('image/')) throw new Error(imageErrors.format);
  if (file.size > maxBytes) throw new Error(imageErrors.size);
  const picture = await decode(file);
  try {
    if (picture.width < 1 || picture.height < 1) throw new Error(imageErrors.format);
    const scale = Math.min(1, maxSide / Math.max(picture.width, picture.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(picture.width * scale);
    canvas.height = Math.round(picture.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error(imageErrors.format);
    // Transparent pictures on white: black text must not end on a black background.
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(picture.source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    canvas.width = 0; canvas.height = 0;
    if (!blob) throw new Error(imageErrors.format);
    return blob;
  } finally { picture.close(); }
}

export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(new Error(imageErrors.format));
    reader.readAsDataURL(blob);
  });
}

// Profile picture of the Standard mode (features/settings/profileImage.ts): the centred square of the photo, upright,
// `side` px, as a JPEG data URL. No manual crop: a face is usually near the middle, and «Cambia foto» is one tap.
// Lower qualities are tried if a detailed photo would exceed `maxLength`.
export async function prepareAvatar(file: Blob, side = 192, maxLength = 200_000): Promise<string> {
  if (file.type && !file.type.startsWith('image/')) throw new Error(imageErrors.format);
  if (file.size > maxBytes) throw new Error(imageErrors.size);
  const picture = await decode(file);
  try {
    if (picture.width < 1 || picture.height < 1) throw new Error(imageErrors.format);
    const crop = Math.min(picture.width, picture.height);
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext('2d');
    if (!context) throw new Error(imageErrors.format);
    context.fillStyle = 'white';
    context.fillRect(0, 0, side, side);
    context.imageSmoothingQuality = 'high';
    context.drawImage(picture.source, (picture.width - crop) / 2, (picture.height - crop) / 2, crop, crop, 0, 0, side, side);
    for (const quality of [0.85, 0.7, 0.5]) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.startsWith('data:image/jpeg') && url.length <= maxLength) { canvas.width = 0; canvas.height = 0; return url; }
    }
    throw new Error(imageErrors.format);
  } finally { picture.close(); }
}
