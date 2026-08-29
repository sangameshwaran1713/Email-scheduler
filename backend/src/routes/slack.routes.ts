import { Router } from 'express';
import {
  slackConnectRedirect,
  slackAuthCallback,
  getSlackStatus,
  disconnectSlack,
} from '../controllers/slack.controller.js';
import { authMiddleware } from '../auth/middleware.js';

const router = Router();

router.get('/connect', authMiddleware, slackConnectRedirect);
router.get('/callback', slackAuthCallback);
router.get('/status', authMiddleware, getSlackStatus);
router.post('/disconnect', authMiddleware, disconnectSlack);

export default router;
