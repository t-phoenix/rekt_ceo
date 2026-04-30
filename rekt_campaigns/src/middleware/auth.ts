import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../types';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        address: string;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);

    // Attach user to request
    req.user = { address: payload.address };

    next();
  } catch (error) {
    next(error);
  }
}

/** Sets `req.user` when a valid Bearer token is present; otherwise continues without auth. */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    req.user = { address: payload.address };
  } catch {
    // Invalid token: treat as anonymous bootstrap (do not fail the whole request).
  }
  next();
}

