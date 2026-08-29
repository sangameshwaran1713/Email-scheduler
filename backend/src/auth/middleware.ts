import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      email?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  let token: string | null = null;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Fallback to HttpOnly cookie if header is not present
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map((c) => c.trim());
    const authCookie = cookies.find((c) => c.startsWith('reachinbox_token='));
    if (authCookie) {
      token = authCookie.substring('reachinbox_token='.length);
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Authentication token missing. Please log in with Google OAuth.',
    });
  }

  const payload = verifyToken(token);

  if (!payload || !payload.userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Invalid or expired session token. Please log in again.',
    });
  }

  req.userId = payload.userId;
  req.email = payload.email;
  next();
}
