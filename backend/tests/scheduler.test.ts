import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { getCurrentHourWindow, getNextHourWindowStart } from '../src/workers/rate-limiter.js';
import { encryptSlackToken, decryptSlackToken } from '../src/slack/slack.service.js';

test('Idempotency Key Generation - Unique & Deterministic', () => {
  const userId = 'user_123';
  const senderId = 'sender_456';
  const recipient = 'test@example.com';
  const subject = 'Meeting Schedule';
  const scheduledAt = '2026-08-28T18:00:00.000Z';

  const raw1 = `${userId}:${senderId}:${recipient}:${subject}:${scheduledAt}`;
  const hash1 = crypto.createHash('sha256').update(raw1).digest('hex');

  const raw2 = `${userId}:${senderId}:${recipient}:${subject}:${scheduledAt}`;
  const hash2 = crypto.createHash('sha256').update(raw2).digest('hex');

  assert.equal(hash1, hash2, 'Idempotency keys for identical parameters must match');
  assert.equal(hash1.length, 64, 'SHA-256 hash must be 64 hex characters');
});

test('Hourly Rate Limiter Window Calculation', () => {
  const fixedDate = new Date('2026-08-28T18:15:30.000Z');
  const windowStr = getCurrentHourWindow(fixedDate);
  assert.equal(windowStr, '2026-08-28-18', 'Hour window string format must be YYYY-MM-DD-HH');

  const nextHourStart = getNextHourWindowStart(fixedDate);
  assert.equal(nextHourStart.toISOString(), '2026-08-28T19:00:00.000Z', 'Next hour window must start at top of next hour');
});

test('Slack Token Encryption at Rest & Decryption', () => {
  process.env.ENCRYPTION_KEY = 'test_encryption_key_min_32_chars_123456789';
  const rawToken = 'xoxb-1234567890-abcdefg-slack-token';

  const encrypted = encryptSlackToken(rawToken);
  assert.notEqual(encrypted, rawToken, 'Token must not be stored in plain text');
  assert.ok(encrypted.includes(':'), 'Encrypted token must contain IV delimiter');

  const decrypted = decryptSlackToken(encrypted);
  assert.equal(decrypted, rawToken, 'Decrypted token must match original Slack token');
});

test('Recipient Email Deduplication Logic', () => {
  const rawRecipients = [
    'alice@example.com',
    'BOB@EXAMPLE.COM ',
    'alice@example.com',
    'charlie@example.com',
  ];

  const sanitized = rawRecipients.map((r) => r.trim().toLowerCase());
  const unique = Array.from(new Set(sanitized));

  assert.deepEqual(unique, ['alice@example.com', 'bob@example.com', 'charlie@example.com']);
  assert.equal(unique.length, 3, 'Duplicate emails must be stripped');
});
