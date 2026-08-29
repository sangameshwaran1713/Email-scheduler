import { Request, Response } from 'express';
import axios from 'axios';
import { getPrismaClient } from '../db/prisma.js';
import { config } from '../config/index.js';
import { generateToken } from '../auth/jwt.js';
import { logger } from '../config/logger.js';

export async function googleLoginRedirect(req: Request, res: Response) {
  if (!config.GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID.startsWith('your_google_client_id')) {
    logger.info({ message: 'Google OAuth credentials not configured in .env, initiating dev login redirect' });
    const devToken = generateToken('google-dev-user-id', 'user@gmail.com');
    return res.redirect(`${config.FRONTEND_URL}/dashboard?token=${encodeURIComponent(devToken)}`);
  }

  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: config.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(authUrl);
}

export async function googleAuthCallback(req: Request, res: Response) {
  const { code, error } = req.query;

  if (error) {
    logger.warn({ message: 'Google OAuth access denied by user', error });
    return res.redirect(`${config.FRONTEND_URL}/login?error=access_denied`);
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'OAuth Callback Error',
      error: 'Missing authorization code from Google OAuth redirect.',
    });
  }

  try {
    // Exchange authorization code for Google access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.GOOGLE_CALLBACK_URL,
    });

    const { access_token } = tokenResponse.data;

    // Fetch user profile from Google UserInfo API
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { id: googleId, email, name, picture: avatar } = profileResponse.data;

    if (!email || !googleId) {
      throw new Error('Incomplete user profile received from Google');
    }

    // Upsert User in PostgreSQL database
    const prisma = getPrismaClient();
    const user = await prisma.user.upsert({
      where: { googleId },
      update: {
        email,
        name: name || email.split('@')[0],
        avatar,
      },
      create: {
        googleId,
        email,
        name: name || email.split('@')[0],
        avatar,
      },
    });

    // Create default sender for user if none exists
    const existingSender = await prisma.sender.findFirst({
      where: { userId: user.id, email: user.email },
    });

    if (!existingSender) {
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }

    // Generate JWT session token
    const token = generateToken(user.id, user.email);

    // Set secure HttpOnly cookie
    res.cookie('reachinbox_token', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info({ message: 'Google OAuth login successful', userId: user.id, email: user.email });

    // Redirect to frontend dashboard with token in URL parameter
    res.redirect(`${config.FRONTEND_URL}/dashboard?token=${encodeURIComponent(token)}`);
  } catch (err: any) {
    logger.error({
      message: 'Google OAuth authentication failed',
      error: err.response?.data || err.message || err,
    });

    res.status(500).json({
      success: false,
      message: 'Google OAuth login failed',
      error: err.response?.data?.error_description || err.message || 'Could not verify Google credentials',
    });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        googleId: true,
        createdAt: true,
        senders: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        slackConnection: {
          select: {
            isConnected: true,
            slackTeamId: true,
            slackUserId: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: err.message,
    });
  }
}

export async function logoutUser(req: Request, res: Response) {
  res.clearCookie('reachinbox_token');
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}

export async function manualLogin(req: Request, res: Response) {
  // This app uses Google OAuth as the primary authentication method.
  // Manual email/password login is not supported as the User schema
  // does not store password hashes.
  return res.status(400).json({
    success: false,
    message: 'Email/password login is not supported. Please use Google OAuth to sign in.',
  });
}
