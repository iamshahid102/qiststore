import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { catalogRouter } from '../modules/catalog/catalog.routes.js';
import { contentRouter } from '../modules/content/content.routes.js';
import { checkoutRouter } from '../modules/checkout/checkout.routes.js';
import { adminRouter } from '../modules/admin/admin.routes.js';
import { uploadRouter } from '../modules/uploads/upload.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/', catalogRouter);
apiRouter.use('/', contentRouter);
apiRouter.use('/', checkoutRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/admin', uploadRouter);
