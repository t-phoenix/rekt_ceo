import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { logger } from '../utils/logger';

export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Handle AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }

  // Handle unexpected errors
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}

