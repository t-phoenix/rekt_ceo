import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../types';
import { logger } from './logger';

export interface JWTPayload {
  address: string;
  iat?: number;
  exp?: number;
}

export function generateToken(address: string): string {
  return jwt.sign(
    { address },
    config.jwtSecret as string,
    { expiresIn: config.jwtExpiry } as jwt.SignOptions
  );
}

export function verifyToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JWTPayload;
    return payload;
  } catch (error: unknown) {
    const e = error as Error & { name?: string };
    if (config.nodeEnv === 'development') {
      const hint =
        e?.name === 'TokenExpiredError'
          ? 'Token expired — sign in again with SIWE.'
          : e?.name === 'JsonWebTokenError'
            ? 'Invalid signature — almost always JWT_SECRET differs from rekt_backend (compare both .env files byte-for-byte, no extra spaces).'
            : 'See jwtErrorMessage below.';
      logger.warn(`JWT verify failed: ${hint}`, {
        jwtErrorName: e?.name,
        jwtErrorMessage: e?.message,
      });
    }
    throw new AppError(401, 'Invalid or expired token');
  }
}

