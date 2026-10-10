import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let configured = false;

export function isCloudinaryConfigured(): boolean {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

/** Configure the SDK once, lazily. Safe to call on every request. */
export function getCloudinary() {
  if (!isCloudinaryConfigured()) return null;
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
    logger.info({ cloud: env.CLOUDINARY_CLOUD_NAME }, 'Cloudinary configured');
  }
  return cloudinary;
}

export interface UploadedAsset {
  url: string; // delivery URL (CDN)
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  resourceType: string;
}

/** Upload an in-memory buffer to Cloudinary (images by default). */
export async function uploadBuffer(
  buffer: Buffer,
  options: { folder?: string; resourceType?: 'image' | 'raw' | 'auto'; tags?: string[] } = {},
): Promise<UploadedAsset> {
  const cld = getCloudinary();
  if (!cld) throw new Error('CLOUDINARY_NOT_CONFIGURED');

  const folder = options.folder ?? env.CLOUDINARY_FOLDER;

  return new Promise<UploadedAsset>((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        folder,
        resource_type: options.resourceType ?? 'image',
        tags: options.tags,
        // Reasonable defaults for catalogue imagery
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          resourceType: result.resource_type,
        });
      },
    );
    stream.end(buffer);
  });
}

/** Remove an asset from Cloudinary by public id. */
export async function destroyAsset(publicId: string, resourceType: 'image' | 'raw' | 'auto' = 'image'): Promise<void> {
  const cld = getCloudinary();
  if (!cld) throw new Error('CLOUDINARY_NOT_CONFIGURED');
  await cld.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
}
