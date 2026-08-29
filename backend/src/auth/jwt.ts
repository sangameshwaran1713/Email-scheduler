import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, config.JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
  } catch (err: any) {
    // Distinguish expired from invalid for easier debugging
    if (err?.name === 'TokenExpiredError') {
      return null; // Expired — caller returns 401 with generic message
    }
    return null;
  }
}
