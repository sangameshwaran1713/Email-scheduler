import { Router } from 'express';
import {
  scheduleEmailCampaign,
  getScheduledEmails,
  getSentEmails,
  searchEmails,
} from '../controllers/email.controller.js';
import { authMiddleware } from '../auth/middleware.js';

const router = Router();

router.post('/schedule', authMiddleware, scheduleEmailCampaign);
router.get('/scheduled', authMiddleware, getScheduledEmails);
router.get('/sent', authMiddleware, getSentEmails);
router.get('/search', authMiddleware, searchEmails);

export default router;
