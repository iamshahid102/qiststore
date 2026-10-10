import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

type Source = 'body' | 'query' | 'params';

/** Validate req[source] with a zod schema; parsed value replaces the original. */
export function validate(schema: ZodType, source: Source = 'body') {
  return (req: Request, resRef: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    if (source === 'query') {
      // Express 5 exposes query as a getter; stash parsed values on res.locals
      resRef.locals.parsedQuery = parsed.data;
    } else {
      Object.assign(req[source] as object, parsed.data);
    }
    next();
  };
}
