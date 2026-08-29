import { Router } from 'express';
import {
  googleLoginRedirect,
  googleAuthCallback,
  getCurrentUser,
  logoutUser,
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../auth/middleware.js';

const router = Router();

router.get('/google', googleLoginRedirect);
router.get('/google/callback', googleAuthCallback);
router.get('/me', authMiddleware, getCurrentUser);
router.post('/logout', authMiddleware, logoutUser);

export default router;
