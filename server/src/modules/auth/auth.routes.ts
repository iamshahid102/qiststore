import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';
import { ok } from '../../utils/response.js';
import { ApiError, asyncHandler } from '../../utils/errors.js';
import { requireAuth, signAccessToken, type AccessTokenPayload } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { sensitiveLimiter } from '../../middlewares/rateLimit.js';

export const authRouter = Router();

const phoneRegex = /^(\+92|0)3\d{9}$/;

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().regex(phoneRegex, 'Invalid Pakistani mobile number'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).max(72),
});

const loginSchema = z.object({
  phone: z.string().min(7),
  password: z.string().min(1),
});

interface RefreshPayload {
  sub: string;
  role: string;
  tv: number;
}

function issueRefreshToken(userId: string, role: string, tokenVersion: number): string {
  return jwt.sign({ sub: userId, role, tv: tokenVersion }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
  });
}

function setRefreshCookie(res: import('express').Response, token: string): void {
  res.cookie('qb_rt', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/api/v1/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

authRouter.post(
  '/register',
  sensitiveLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, phone, password, email } = req.body as z.infer<typeof registerSchema>;
    const existing = await User.findOne({ phone });
    if (existing) throw ApiError.conflict('An account with this phone number already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, phone, email: email || undefined, passwordHash });

    const payload: AccessTokenPayload = { sub: String(user._id), role: user.role, name: user.name };
    const access = signAccessToken(payload);
    setRefreshCookie(res, issueRefreshToken(payload.sub, user.role, user.tokenVersion));
    ok(res, { accessToken: access, user: { id: payload.sub, name: user.name, phone: user.phone, role: user.role } }, undefined, 201);
  }),
);

authRouter.post(
  '/login',
  sensitiveLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { phone, password } = req.body as z.infer<typeof loginSchema>;
    const user = await User.findOne({ phone });
    if (!user) throw ApiError.unauthorized('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw ApiError.unauthorized('Account temporarily locked. Try again later.');
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginCount = 0;
      }
      await user.save();
      throw ApiError.unauthorized('Invalid credentials');
    }

    if (user.status === 'blocked') throw ApiError.forbidden('Account blocked. Contact support.');

    user.failedLoginCount = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const payload: AccessTokenPayload = { sub: String(user._id), role: user.role, name: user.name };
    const access = signAccessToken(payload);
    setRefreshCookie(res, issueRefreshToken(payload.sub, user.role, user.tokenVersion));
    ok(res, {
      accessToken: access,
      user: { id: payload.sub, name: user.name, phone: user.phone, role: user.role },
    });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = (req.cookies as Record<string, string> | undefined)?.qb_rt;
    if (!token) throw ApiError.unauthorized('No refresh token');
    let payload: RefreshPayload;
    try {
      payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    const user = await User.findById(payload.sub);
    if (!user || user.status === 'blocked' || user.tokenVersion !== payload.tv) {
      throw ApiError.unauthorized('Refresh token revoked');
    }
    const accessPayload: AccessTokenPayload = { sub: String(user._id), role: user.role, name: user.name };
    const access = signAccessToken(accessPayload);
    // Rotation: re-issue refresh token too
    setRefreshCookie(res, issueRefreshToken(accessPayload.sub, user.role, user.tokenVersion));
    ok(res, { accessToken: access });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    res.clearCookie('qb_rt', { path: '/api/v1/auth' });
    ok(res, { loggedOut: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.sub).select('name email phone role verificationStatus createdAt');
    if (!user) throw ApiError.notFound('User not found');
    ok(res, user);
  }),
);
