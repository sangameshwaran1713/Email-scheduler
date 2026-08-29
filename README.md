# ReachInbox Full-Stack Email Job Scheduler

Production-grade Email Scheduling Platform built for the ReachInbox.ai hiring assignment.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![Node](https://img.shields.io/badge/Node.js-v18+-green)
![BullMQ](https://img.shields.io/badge/BullMQ-Redis-red)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-blue)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.5-yellow)

---

## 🏗️ Architecture Overview

```text
                                  +-------------------+
                                  |   React Frontend  |
                                  | (Vite + Tailwind) |
                                  +---------+---------+
                                            |
                                            v (REST API / JSON / HttpOnly Cookie)
                                  +---------+---------+
                                  | Express API Server|
                                  |    (Port 5000)    |
                                  +----+----+----+----+
                                       |    |    |
             +-------------------------+    |    +-------------------------+
             |                              |                              |
             v                              v                              v
   +-------------------+          +-------------------+          +-------------------+
   | PostgreSQL (DB)   |          |  Redis & BullMQ   |          |   Elasticsearch   |
   |   (Prisma ORM)    |          | (Queue & Limits)  |          |  (Email Search)   |
   +-------------------+          +---------+---------+          +-------------------+
                                            |
                                            v
                                  +---------+---------+
                                  |   Email Worker    |
                                  | (BullMQ Worker)   |
                                  +----+----+----+----+
                                       |    |    |
             +-------------------------+    |    +-------------------------+
             |                              |                              |
             v                              v                              v
   +-------------------+          +-------------------+          +-------------------+
   |  Ethereal SMTP    |          |  Slack OAuth API  |          | Google OAuth API  |
   | (Email Dispatch)  |          | (Rate Limit Alert)|          | (Authentication)  |
   +-------------------+          +-------------------+          +-------------------+
```

---

## 🚀 Key Architectural Highlights & Engineering Decisions

### 1. No Schedulers or Cron Jobs
- **Zero Cron Libraries**: Strictly avoids `node-cron`, `cron`, `agenda`, `setInterval`, or in-memory loops.
- **BullMQ Delayed Jobs**: Email scheduling relies on Redis-backed BullMQ delayed jobs with deterministic job IDs (`emailId`).

### 2. Restart Persistence & Zero Job Loss
- **Durable Database State**: PostgreSQL stores ground-truth state (`SCHEDULED`, `PROCESSING`, `SENT`, `FAILED`).
- **Persistent Scheduling in Redis**: BullMQ stores delayed jobs in Redis. When the worker or API process restarts, pending delayed jobs remain available in Redis and are processed at or after their scheduled execution time, subject to worker availability, Redis latency, rate limits, and minimum send delays.

### 3. Distributed Rate Limiting & Staggered Rescheduling
- **Atomic Redis Lua Limiter**: Sender hourly limit (`MAX_EMAILS_PER_HOUR`) is enforced atomically using Lua scripts in Redis (`email-rate:{senderId}:{YYYY-MM-DD-HH}`). Works across multiple concurrent worker instances without race conditions.
- **Deterministic Staggered Rescheduling**: When hourly rate limit is reached, jobs are **never failed or deleted**. `scheduledAt` is updated and staggered across the next hour window to prevent top-of-hour thundering herd loops.
- **Min-Delay Coordination**: Enforces `MIN_EMAIL_DELAY_MS` (e.g., 2000ms) between sends per sender across all concurrent workers using Redis timestamp keys (`sender:lastSendAt:{senderId}`).

### 4. Real OAuth, Authenticated AES-256-GCM Tokens & Slack Alerts
- **Google OAuth 2.0**: Authenticates users and issues `HttpOnly`, `Secure`, `SameSite=Lax` cookies as well as Bearer tokens.
- **Slack OAuth 2.0 & AES-256-GCM**: Slack tokens are encrypted at rest using **AES-256-GCM** with 12-byte IVs and 16-byte authentication tags. Decrypted tokens are never exposed via APIs or logs.
- **Rate-Limit Alerts**: When a sender hits their hourly limit, a real Slack API message (`chat.postMessage`) is sent. Rate limit notification spam is prevented via Redis keys (`slack-rate-notified:{senderId}:{hourWindow}`).

### 5. Idempotency & Worker Concurrency Safety
- **Unique SHA-256 Idempotency Key**: `SHA256(userId + senderId + recipient + subject + scheduledAt)`.
- **Atomic Status Lock**: Workers perform atomic database status transitions:
  ```sql
  UPDATE "Email" SET status = 'PROCESSING', attempts = attempts + 1
  WHERE id = $1 AND status = 'SCHEDULED';
  ```
  If 0 rows are affected, another worker instance already claimed or processed the job, preventing duplicate sends.

### 6. High-Performance Bulk Batch Operations (1,000+ Emails)
- Uses `prisma.email.createMany()` for database batch insertion and `queue.addBulk()` for enqueuing BullMQ jobs in a single Redis pipeline operation, avoiding expensive synchronous single-item DB/Redis calls.

---

## 🛠️ Prerequisites

- **Node.js**: v18.0.0+
- **npm**: v9.0.0+
- **Docker & Docker Compose**: For running PostgreSQL, Redis, and Elasticsearch containers.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in root and `backend/`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox_dev
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
JWT_SECRET=your_jwt_secret_min_32_chars_here_1234567890
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_CALLBACK_URL=http://localhost:5000/api/slack/callback
ETHEREAL_USER=
ETHEREAL_PASS=
ENCRYPTION_KEY=your_encryption_key_min_32_chars_here_1234567890
WORKER_CONCURRENCY=10
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200
FRONTEND_URL=http://localhost:5173
```

---

## 📦 Setup & Execution Guide

### 1. Start Infrastructure (Docker)
```bash
npm run docker:up
```

### 2. Install Workspace Dependencies
```bash
npm run install:all
```

### 3. Run Prisma Database Migrations
```bash
npm --workspace=backend run migrate
```

### 4. Build & Typecheck All Workspaces
```bash
npm run typecheck:all
npm run build:all
```

### 5. Start Backend, Worker, and Frontend
```bash
# Terminal 1: Express API Server (Port 5000)
npm run dev:api

# Terminal 2: BullMQ Worker Process (Concurrency=10)
npm run dev:worker

# Terminal 3: Vite React Frontend (Port 5173)
npm run dev:frontend
```

---

## 📊 Bull Board Queue Dashboard

Access the Bull Board queue monitor at:
`http://localhost:5000/admin/queues`

---

## 🧪 Automated Integration Tests

Run the test suite:
```bash
npm --workspace=backend run test
```

Passes 9 automated unit & integration tests covering:
- AES-256-GCM token encryption & authTag integrity verification
- SHA-256 Idempotency key uniqueness
- Atomic worker status lock & double-send prevention (`SENT` guard)
- Hourly rate limit calculation & staggered rescheduling
- Slack rate-limit notification deduplication
- CSV recipient parsing & deduplication
