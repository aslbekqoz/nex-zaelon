// Turns an uploaded picture into a safe, small avatar. Kept free of server-only imports so it
// can be unit tested with real images.
//
// Every upload is decoded and re-encoded: the output is a fresh 256x256 WebP, so EXIF data
// (including GPS location), colour profiles, comments and anything smuggled inside the file
// are dropped. The format is detected from the bytes, never from the file name or MIME type.

import sharp, { type Metadata } from "sharp";

export const AVATAR_SIZE = 256;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Refuse images larger than this many pixels before decoding (decompression bombs). */
export const MAX_PIXELS = 40_000_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif", "gif"]);

export class AvatarError extends Error {}

export async function processAvatar(input: Uint8Array) {
  if (input.byteLength === 0) throw new AvatarError("Choose a picture to upload.");
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new AvatarError("The picture is larger than 5 MB.");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new AvatarError("That file isn't a picture we can read. Use JPEG, PNG, WebP, AVIF or GIF.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new AvatarError("That file isn't a picture we can read. Use JPEG, PNG, WebP, AVIF or GIF.");
  }
  if (!meta.width || !meta.height || meta.width * meta.height > MAX_PIXELS) {
    throw new AvatarError("The picture's dimensions are too large.");
  }
  if (Math.min(meta.width, meta.height) < 32) throw new AvatarError("The picture is too small (at least 32×32 pixels).");

  try {
    return await sharp(input, { limitInputPixels: MAX_PIXELS, animated: false })
      .rotate() // respect the camera's orientation, then forget it
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new AvatarError("We couldn't process that picture. Try a different one.");
  }
}
