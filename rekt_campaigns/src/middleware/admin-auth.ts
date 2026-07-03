import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

/**
 * Lightweight admin gate.
 * Requires header: `x-admin-key: <ADMIN_API_KEY>`.
 * Used for campaign layout, presets, and other ops endpoints until full RBAC ships.
 *
 * In production, set ADMIN_API_KEY in your env (Render -> Environment).
 * If ADMIN_API_KEY is not set, the gate FAILS-CLOSED with a 503 to avoid
 * accidental open admin surface.
 */
export function adminAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const expected = process.env.ADMIN_API_KEY;
    if (!expected) {
      throw new AppError(503, 'Admin API not configured (set ADMIN_API_KEY)');
    }

    const provided = req.headers['x-admin-key'];
    if (typeof provided !== 'string' || provided !== expected) {
      throw new AppError(401, 'Invalid admin key');
    }

    next();
  } catch (error) {
    next(error);
  }
}
