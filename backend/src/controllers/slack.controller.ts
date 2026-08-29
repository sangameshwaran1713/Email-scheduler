import { Request, Response } from 'express';
import axios from 'axios';
import { getPrismaClient } from '../db/prisma.js';
import { config } from '../config/index.js';
import { encryptSlackToken } from '../slack/slack.service.js';
import { logger } from '../config/logger.js';

export async function slackConnectRedirect(req: Request, res: Response) {
  if (!config.SLACK_CLIENT_ID || config.SLACK_CLIENT_ID.startsWith('your_slack_client_id')) {
    return res.status(400).json({
      success: false,
      message: 'Slack OAuth configuration missing',
      error: 'SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be configured in backend/.env',
    });
  }

  const params = new URLSearchParams({
    client_id: config.SLACK_CLIENT_ID,
    user_scope: 'chat:write',
    redirect_uri: config.SLACK_CALLBACK_URL,
    state: req.userId || '',
  });

  const slackUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  res.redirect(slackUrl);
}

export async function slackAuthCallback(req: Request, res: Response) {
  const { code, state, error } = req.query;

  if (error) {
    logger.warn({ message: 'Slack OAuth access denied by user', error });
    return res.redirect(`${config.FRONTEND_URL}/dashboard?slack=denied`);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Slack OAuth Callback Error',
      error: 'Missing authorization code from Slack redirect.',
    });
  }

  try {
    // Exchange code for Slack Access Token
    const tokenRes = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: config.SLACK_CLIENT_ID,
        client_secret: config.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: config.SLACK_CALLBACK_URL,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    if (!tokenRes.data.ok) {
      throw new Error(tokenRes.data.error || 'Slack OAuth token exchange failed');
    }

    const { authed_user, team } = tokenRes.data;
    const userAccessToken = authed_user?.access_token || tokenRes.data.access_token;
    const slackUserId = authed_user?.id || 'U_DEFAULT';
    const slackTeamId = team?.id || 'T_DEFAULT';
    const userId = (state as string) || req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Slack OAuth Error',
        error: 'Missing user context for Slack integration.',
      });
    }

    // Encrypt token at rest
    const encryptedToken = encryptSlackToken(userAccessToken);

    const prisma = getPrismaClient();
    await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        slackUserId,
        slackTeamId,
        accessToken: encryptedToken,
        isConnected: true,
      },
      create: {
        userId,
        slackUserId,
        slackTeamId,
        accessToken: encryptedToken,
        isConnected: true,
      },
    });

    logger.info({ message: 'Slack integration connected successfully', userId, slackTeamId });

    res.redirect(`${config.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (err: any) {
    logger.error({ message: 'Slack OAuth error', error: err.response?.data || err.message || err });
    res.status(500).json({
      success: false,
      message: 'Slack connection failed',
      error: err.message || 'OAuth error',
    });
  }
}

export async function getSlackStatus(req: Request, res: Response) {
  try {
    const prisma = getPrismaClient();
    const conn = await prisma.slackConnection.findUnique({
      where: { userId: req.userId },
      select: {
        isConnected: true,
        slackTeamId: true,
        slackUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: conn || { isConnected: false },
    });
  } catch (err: any) {
    logger.warn({ message: 'DB query fallback for getSlackStatus', error: err.message });
    res.json({
      success: true,
      data: { isConnected: false },
    });
  }
}

export async function disconnectSlack(req: Request, res: Response) {
  try {
    const prisma = getPrismaClient();
    await prisma.slackConnection.update({
      where: { userId: req.userId },
      data: { isConnected: false },
    });

    res.json({
      success: true,
      message: 'Slack disconnected successfully',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Slack',
      error: err.message,
    });
  }
}
