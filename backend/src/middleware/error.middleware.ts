import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  logger.error({
    error: err.message || err,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Authentication required',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const response: Record<string, any> = {
    success: false,
    message: err.message || 'Internal server error',
    error: config.NODE_ENV === 'development' ? err.stack : 'An unexpected error occurred',
  };

  res.status(statusCode).json(response);
}
