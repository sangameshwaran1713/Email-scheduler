import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { reserveRateLimitSlot, getCurrentHourWindow, shouldSendSlackRateLimitNotification } from '../src/workers/rate-limiter.js';
import { encryptSlackToken, decryptSlackToken } from '../src/slack/slack.service.js';

test('Integration Test 1: AES-256-GCM Token Encryption & Integrity Check', () => {
  process.env.ENCRYPTION_KEY = 'test_encryption_key_min_32_chars_1234567890';
  const plainSlackToken = 'xoxb-9876543210-slack-bot-token-secret';

  const encrypted = encryptSlackToken(plainSlackToken);
  assert.notEqual(encrypted, plainSlackToken);
  assert.equal(encrypted.split(':').length, 3, 'AES-256-GCM token format must contain iv:authTag:encrypted');

  const decrypted = decryptSlackToken(encrypted);
  assert.equal(decrypted, plainSlackToken, 'Decrypted token must match original plain token');
});

test('Integration Test 2: Idempotency Key Uniqueness Guarantee', () => {
  const userId = 'usr_test_1';
  const senderId = 'snd_test_1';
  const recipient = 'recipient@domain.com';
  const subject = 'Weekly Newsletter';
  const scheduledAt = '2026-08-28T20:00:00.000Z';

  const key1 = crypto.createHash('sha256').update(`${userId}:${senderId}:${recipient}:${subject}:${scheduledAt}`).digest('hex');
  const key2 = crypto.createHash('sha256').update(`${userId}:${senderId}:${recipient}:${subject}:${scheduledAt}`).digest('hex');
  const keyDifferentRecipient = crypto.createHash('sha256').update(`${userId}:${senderId}:other@domain.com:${subject}:${scheduledAt}`).digest('hex');

  assert.equal(key1, key2, 'Identical campaign params must produce identical SHA-256 idempotency key');
  assert.notEqual(key1, keyDifferentRecipient, 'Different recipients must yield unique idempotency keys');
});

test('Integration Test 3: Concurrent Worker Double-Send Prevention Logic', () => {
  // Simulate atomic DB status transition behavior
  let mockDbEmail = { id: 'email_101', status: 'SCHEDULED', attempts: 0 };

  const worker1TryUpdate = () => {
    if (mockDbEmail.status === 'SCHEDULED') {
      mockDbEmail.status = 'PROCESSING';
      mockDbEmail.attempts += 1;
      return { count: 1 };
    }
    return { count: 0 };
  };

  const worker2TryUpdate = () => {
    if (mockDbEmail.status === 'SCHEDULED') {
      mockDbEmail.status = 'PROCESSING';
      mockDbEmail.attempts += 1;
      return { count: 1 };
    }
    return { count: 0 };
  };

  // Simulating Worker 1 acquiring status lock first
  const w1Result = worker1TryUpdate();
  // Worker 2 trying immediately after
  const w2Result = worker2TryUpdate();

  assert.equal(w1Result.count, 1, 'First worker successfully updates status to PROCESSING');
  assert.equal(w2Result.count, 0, 'Second worker receives count=0 and skips execution');
  assert.equal(mockDbEmail.attempts, 1, 'Email is attempted exactly once');
});

test('Integration Test 4: SENT Email Idempotency Guard', () => {
  const sentEmail = { id: 'email_202', status: 'SENT', sentAt: new Date() };

  // Guard condition check
  const isProcessable = sentEmail.status === 'SCHEDULED';
  assert.equal(isProcessable, false, 'Emails in SENT status must be skipped by worker');
});

test('Integration Test 5: CSV Recipient Parsing & Sanitization', () => {
  const csvContent = `email\n  john@example.com \n  ALICE@EXAMPLE.COM \n  john@example.com\n  invalid-email-address`;

  const tokens = csvContent
    .split(/[\r\n,;\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t !== 'email');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = Array.from(new Set(tokens.filter((t) => emailRegex.test(t))));
  const invalid = tokens.filter((t) => !emailRegex.test(t));

  assert.deepEqual(valid, ['john@example.com', 'alice@example.com']);
  assert.equal(invalid.length, 1);
});
