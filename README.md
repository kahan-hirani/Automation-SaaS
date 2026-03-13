# Automation SaaS Server

Production-oriented backend for scheduled automations with queue-based execution, worker processing, logs, metrics, and notifications.

This service powers three automation engines:
- `WEBSITE_UPTIME`
- `PRICE_MONITOR`
- `JOB_MONITOR`

## Table of contents

1. Overview
2. Tech stack
3. System architecture
4. Folder structure
5. Runtime components and workflow
6. Data model
7. API reference
8. Local setup
9. Docker deployment
10. Environment variables reference
11. API response and error format
12. Testing strategy (A to Z)
13. Monitoring and operations
14. Security and hardening checklist
15. Troubleshooting

## 1) Overview

The server is responsible for:
- User authentication and profile management
- Automation CRUD with plan-based limits
- Cron-based scheduling
- Queue job dispatching and retries
- Worker execution via Puppeteer handlers
- Email notifications for success/failure
- Logs and metrics APIs for dashboard visibility

## 2) Tech stack

- Node.js 20
- Express 5
- PostgreSQL + Sequelize
- Redis + BullMQ
- node-cron + cron-parser
- Puppeteer
- JWT + bcrypt
- Nodemailer
- Winston
- Jest + Supertest
- Docker + Docker Compose

## 3) System architecture

```text
Frontend (client)
    |
    | HTTP / JWT
    v
Express API (src/server.js)
    |
    +-- Controllers (auth, automations, logs, metrics)
    |       |
    |       v
    |    Services + Models (PostgreSQL)
    |
    +-- Scheduler (src/schedulers/cron.scheduler.js)
            |
            v
         BullMQ Queue (Redis)
            |
            v
         Worker (src/workers/automation.worker.js)
            |
            +-- Handlers
            |     - uptime.handler.js
            |     - priceMonitor.handler.js
            |     - jobMonitor.handler.js
            |
            +-- Persist execution logs (PostgreSQL)
            +-- Send email notifications
```

## 4) Folder structure

```text
server/
  src/
    config/         # DB/Redis/env config
    controllers/    # Request handlers
    handlers/       # Automation-type execution handlers
    middlewares/    # Auth/error/rate-limit middleware
    models/         # Sequelize models
    queues/         # BullMQ queue setup
    routes/         # API route definitions
    schedulers/     # Cron scheduler
    services/       # Business services (automation, email, metrics)
    utils/          # Logger, token utils, constants
    workers/        # BullMQ worker process
    server.js       # API entrypoint
  tests/            # Jest + Supertest integration tests
  docker-compose.yml
  Dockerfile
```

## 5) Runtime components and workflow

### 5.1 API lifecycle

1. Request enters Express
2. Security middleware runs (`helmet`, `cors`, rate limiter)
3. Auth middleware validates JWT for protected routes
4. Controller delegates to service layer
5. Service layer validates business rules
6. Sequelize persists/queries data
7. Response returned with JSON payload

### 5.2 Automation creation workflow

1. User calls `POST /api/v1/automations/create-automation`
2. Service validates:
   - required fields
   - cron format
   - `automationType`
   - required config fields per type
   - URL format
   - plan limit (free/pro/enterprise)
3. Automation is saved with:
   - `automationType`
   - `config`
   - `automationState`
   - optional legacy `targetUrl` compatibility

### 5.3 Scheduling workflow

Scheduler runs every minute (`* * * * *`):
1. Fetches active automations
2. Evaluates each cron expression
3. If due, pushes job into BullMQ with dedupe `jobId`
4. Jobs use retry policy (`attempts: 3`, exponential backoff)

### 5.4 Worker execution workflow

Worker (`concurrency: 3`) picks queue jobs:
1. Loads automation + owner
2. Selects handler by `automationType`
3. Executes handler logic (Puppeteer or parsing flow)
4. Persists execution log (`success` or `failed`)
5. Sends email notifications
6. Throws errors for BullMQ retry when appropriate

### 5.5 Metrics workflow

`GET /api/v1/metrics` aggregates:
- Queue counts from BullMQ
- Execution stats from `automation_logs` table

## 6) Data model

### Core entities

- `User`
  - account data, plan tier
- `Automation`
  - owner (`userId`)
  - name
  - schedule (cron)
  - status (`isActive`)
  - `automationType`
  - `config` JSON
  - `automationState` JSON
- `AutomationLog`
  - automation reference
  - `status`
  - `result` JSON
  - `error`
  - timestamp

### Automation type config schema

- `WEBSITE_UPTIME`
  - `{ url }`
- `PRICE_MONITOR`
  - `{ url, selector, targetPrice }`
- `JOB_MONITOR`
  - `{ url, selector }`

## 7) API reference

Base URL:

```text
http://localhost:3000/api/v1
```

### 7.1 Auth routes

- `POST /auth/users/register`
- `POST /auth/users/login`
- `POST /auth/users/logout`
- `GET /auth/users/profile` (auth)
- `PUT /auth/users/profile` (auth)
- `DELETE /auth/users/profile` (auth)

### 7.2 Automation routes

- `POST /automations/create-automation` (auth)
- `GET /automations` (auth)
- `GET /automations/:id` (auth)
- `PUT /automations/:id` (auth)
- `PATCH /automations/:id/toggle` (auth)
- `DELETE /automations/:id` (auth)

### 7.3 Logs routes

- `GET /logs?limit=100` (auth) global logs
- `GET /logs/:automationId?limit=50` (auth) automation-scoped logs
- `GET /logs/stats` (auth)

### 7.4 Metrics route

- `GET /metrics?timeRange=24h` (auth)

### 7.5 Example payloads

Register:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Create uptime automation:

```json
{
  "name": "Main site health",
  "schedule": "*/5 * * * *",
  "automationType": "WEBSITE_UPTIME",
  "config": {
    "url": "https://example.com"
  }
}
```

Create price monitor:

```json
{
  "name": "Track product price",
  "schedule": "*/30 * * * *",
  "automationType": "PRICE_MONITOR",
  "config": {
    "url": "https://shop.example.com/item",
    "selector": ".price",
    "targetPrice": 999.99
  }
}
```

Create job monitor:

```json
{
  "name": "Careers watch",
  "schedule": "0 */2 * * *",
  "automationType": "JOB_MONITOR",
  "config": {
    "url": "https://company.example/careers",
    "selector": ".job-card"
  }
}
```

## 8) Local setup

### 8.1 Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### 8.2 Install and run

```bash
cd server
npm install
```

Copy environment file:

```bash
cp .env.example .env
```

Update `.env` values at minimum:
- `JWT_SECRET`
- DB credentials
- Redis host/port
- SMTP config (or development mail settings)

Start API server:

```bash
npm run dev
```

Start worker in another terminal:

```bash
npm run worker
```

## 9) Docker deployment

Build and run all services:

```bash
cd server
npm run docker:up
```

Stop services:

```bash
npm run docker:down
```

Follow logs:

```bash
npm run docker:logs
```

Compose services include:
- `postgres`
- `redis`
- `api`
- `worker`

## 10) Environment variables reference

Create `.env` from `.env.example` and configure these values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | yes | `development` | Runtime mode (`development` or `production`). |
| `PORT` | yes | `3000` | API server port. |
| `DB_HOST` | yes | `localhost` | PostgreSQL host. |
| `DB_PORT` | yes | `5432` | PostgreSQL port. |
| `DB_NAME` | yes | `automation_saas` | Database name. |
| `DB_USER` | yes | `postgres` | Database username. |
| `DB_PASSWORD` | yes | none | Database password. |
| `REDIS_HOST` | yes | `localhost` | Redis host for BullMQ. |
| `REDIS_PORT` | yes | `6379` | Redis port. |
| `JWT_SECRET` | yes | none | Secret used to sign/verify JWT tokens. |
| `SMTP_HOST` | yes | none | SMTP server host for notification emails. |
| `SMTP_PORT` | yes | `587` | SMTP server port. |
| `SMTP_USER` | yes | none | SMTP account username/email. |
| `SMTP_PASS` | yes | none | SMTP account password/app password. |
| `EMAIL_FROM` | yes | none | Sender identity for email notifications. |
| `LOG_LEVEL` | no | `info` | Winston log level (`debug`, `info`, `warn`, `error`). |

Production recommendations:
- Rotate `JWT_SECRET` regularly.
- Keep SMTP/DB/Redis secrets in a secure secret manager.
- Never commit real credentials.

## 11) API response and error format

### Success response pattern

```json
{
  "success": true,
  "data": {}
}
```

Note: depending on endpoint, the key may be named (`user`, `automation`, `automations`, `logs`, `metrics`, `stats`) instead of generic `data`.

### Error response pattern

```json
{
  "success": false,
  "message": "Human readable error message"
}
```

Common status codes:
- `400` bad request / validation failure
- `401` unauthorized (invalid credentials)
- `404` resource not found
- `429` rate limit exceeded
- `500` internal server error

## 12) Testing strategy (A to Z)

The server test suite uses Jest + Supertest with integration-style API tests.

### 10.1 Available scripts

```bash
cd server
npm test
npm run test:watch
npm run test:coverage
```

### 10.2 Current test files

- `tests/auth.test.js`
  - registration
  - duplicate user prevention
  - login success/failure
  - profile access
- `tests/automation.test.js`
  - automation create/read/update/delete
  - validation behavior
  - plan limit behavior
  - ownership access controls

### 10.3 Test environment expectations

Before running tests, ensure:
- PostgreSQL is reachable with configured credentials
- Redis is running (worker/queue side effects can occur from app startup)

If Redis is not running, you may see connection errors after tests complete.

### 10.4 Recommended release-quality testing workflow

1. API tests

```bash
npm test
```

2. Coverage report

```bash
npm run test:coverage
```

3. Manual API workflow checks (Postman collection)
- Use `Postman_Collection.json`
- Follow `QUICK_START.md` and `POSTMAN_TESTING_GUIDE.md`

4. End-to-end runtime verification
- Start API + worker
- Create each automation type
- Validate queue processing and logs
- Validate email notifications

### 10.5 Suggested future additions

- Separate unit tests for handlers/services
- Dedicated test DB + migration lifecycle
- Testcontainers for isolated PostgreSQL/Redis
- Contract tests for frontend/backend integration

## 13) Monitoring and operations

### Logs

Winston logs to:
- `logs/combined.log`
- `logs/error.log`

Useful commands:

```bash
tail -f logs/combined.log
cat logs/error.log
```

### Operational runbook commands

Start API:

```bash
npm run dev
```

Start worker:

```bash
npm run worker
```

Run tests:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

Docker up/down:

```bash
npm run docker:up
npm run docker:down
```

### Metrics endpoint

`GET /api/v1/metrics` exposes queue + execution health.

### Health check

Root endpoint:

```text
GET /
```

Returns basic API readiness message.

## 14) Security and hardening checklist

- Rotate `JWT_SECRET`
- Run behind HTTPS and reverse proxy
- Restrict CORS origin list in production
- Apply principle-of-least-privilege DB credentials
- Set strong SMTP credentials via secret manager
- Tune rate limits per environment
- Add DB backups and log retention policy
- Pin and regularly audit dependencies

## 15) Troubleshooting

### API starts but worker does not process jobs
- Verify Redis connectivity (`REDIS_HOST`, `REDIS_PORT`)
- Confirm `npm run worker` is running

### Jobs are queued but no logs are created
- Check worker logs for handler errors
- Verify automation is active and config is valid

### Metrics show zeros unexpectedly
- Confirm logs are being written to `automation_logs`
- Verify `timeRange` query and recent execution activity

### Email not sent
- Validate SMTP credentials
- Check provider restrictions and spam folder
- Review worker logs for mail transport errors

### Test failures around connections
- Start PostgreSQL and Redis before `npm test`
- Confirm `.env` points to valid services

---

For step-by-step runtime testing, also see:
- `QUICK_START.md`
- `SETUP_GUIDE.md`
- `POSTMAN_TESTING_GUIDE.md`
