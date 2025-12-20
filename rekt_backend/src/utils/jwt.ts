import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../types';

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
  } catch (error) {
    throw new AppError(401, 'Invalid or expired token');
  }
}

