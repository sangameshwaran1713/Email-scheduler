import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

let transporter: nodemailer.Transporter | null = null;

export async function getSmtpTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) {
    return transporter;
  }

  if (config.ETHEREAL_USER && config.ETHEREAL_PASS) {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: config.ETHEREAL_USER,
        pass: config.ETHEREAL_PASS,
      },
    });
    logger.info({ message: 'Using configured Ethereal SMTP credentials', user: config.ETHEREAL_USER });
  } else {
    logger.info({ message: 'Generating new Ethereal SMTP test account...' });
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logger.info({
      message: 'Created Ethereal test account',
      user: testAccount.user,
      // Password intentionally omitted from logs
    });
  }

  return transporter;
}

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  body: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function sendEmail({ from, to, subject, body }: SendEmailOptions) {
  const mailTransporter = await getSmtpTransporter();

  const info = await mailTransporter.sendMail({
    from,
    to,
    subject,
    text: body,
    html: `<div style="font-family: sans-serif; padding: 20px;">
      <h2>${escapeHtml(subject)}</h2>
      <p style="white-space: pre-wrap;">${escapeHtml(body)}</p>
    </div>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  logger.info({
    message: 'Email dispatched via Ethereal SMTP',
    messageId: info.messageId,
    to,
    subject,
    previewUrl: previewUrl || 'N/A',
  });

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || null,
  };
}
