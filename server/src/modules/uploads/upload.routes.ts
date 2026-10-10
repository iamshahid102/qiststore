import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { Product } from '../../models/Product.js';
import { ok } from '../../utils/response.js';
import { ApiError, asyncHandler } from '../../utils/errors.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { sensitiveLimiter } from '../../middlewares/rateLimit.js';
import { destroyAsset, isCloudinaryConfigured, uploadBuffer } from '../../config/cloudinary.js';

export const uploadRouter = Router();

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(ApiError.badRequest(`Unsupported file type ${file.mimetype}. Allowed: ${ALLOWED_MIME.join(', ')}`));
      return;
    }
    cb(null, true);
  },
});

function requireCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(
      503,
      'Image storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in server/.env',
      'CLOUDINARY_NOT_CONFIGURED',
    );
  }
}

/**
 * POST /api/v1/admin/uploads  (multipart/form-data, field name: "file")
 * Uploads an image to Cloudinary and returns the CDN URL to store on a product.
 */
uploadRouter.post(
  '/uploads',
  requireAuth,
  requireRole('admin', 'staff'),
  sensitiveLimiter,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    requireCloudinary();
    if (!req.file) throw ApiError.badRequest('No file uploaded (expected multipart field "file")');

    const asset = await uploadBuffer(req.file.buffer, {
      tags: ['qiststore', 'product'],
    });

    ok(res, asset, undefined, 201);
  }),
);

/** DELETE /api/v1/admin/uploads?publicId=qiststore/products/xyz */
uploadRouter.delete(
  '/uploads',
  requireAuth,
  requireRole('admin', 'staff'),
  asyncHandler(async (req, res) => {
    requireCloudinary();
    const publicId = String(req.query.publicId ?? '');
    if (!publicId) throw ApiError.badRequest('publicId query parameter is required');
    await destroyAsset(publicId);
    ok(res, { deleted: true, publicId });
  }),
);

// ---------------------------------------------------------------------------
// Attach / detach images on a product (keeps Product.images in sync)
// ---------------------------------------------------------------------------
const attachSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional().default(''),
  alt: z.string().optional().default(''),
});

uploadRouter.post(
  '/products/:slug/images',
  requireAuth,
  requireRole('admin', 'staff'),
  validate(attachSchema),
  asyncHandler(async (req, res) => {
    const { url, publicId, alt } = req.body as z.infer<typeof attachSchema>;
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) throw ApiError.notFound('Product not found');

    const images = [...(product.images ?? []), { url, alt, sort: product.images?.length ?? 0 }];
    product.images = images as never;
    await product.save();

    ok(res, { slug: product.slug, images: product.images, publicId });
  }),
);

uploadRouter.delete(
  '/products/:slug/images',
  requireAuth,
  requireRole('admin', 'staff'),
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) throw ApiError.notFound('Product not found');

    const url = String(req.query.url ?? '');
    const publicId = String(req.query.publicId ?? '');
    if (!url) throw ApiError.badRequest('url query parameter is required');

    product.images = (product.images ?? []).filter((img) => img.url !== url) as never;
    await product.save();

    // Best-effort removal from Cloudinary (ignore storage errors so the DB stays consistent)
    if (publicId && isCloudinaryConfigured()) {
      try {
        await destroyAsset(publicId);
      } catch {
        /* asset may already be gone */
      }
    }

    ok(res, { slug: product.slug, images: product.images });
  }),
);

/** GET /api/v1/admin/uploads/status — lets the admin UI show whether storage is ready */
uploadRouter.get(
  '/uploads/status',
  requireAuth,
  requireRole('admin', 'staff'),
  asyncHandler(async (_req, res) => {
    ok(res, { provider: 'cloudinary', configured: isCloudinaryConfigured() });
  }),
);
