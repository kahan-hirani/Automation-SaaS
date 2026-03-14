# 🤖 Automation SaaS — Backend API

> **Live Frontend:** [https://automation-saas-one.vercel.app/](https://automation-saas-one.vercel.app/)
> **API Base URL:** `https://your-render-service.onrender.com/api/v1`

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-black?logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?logo=redis)](https://upstash.com)
[![Docker](https://img.shields.io/badge/Docker-Render-2496ED?logo=docker)](https://render.com)

---

## What is This?

This is the production backend for the **Automation SaaS** platform. It handles user authentication, cron-based job scheduling, queue-based execution via BullMQ, Puppeteer-powered automation handlers, email notifications, and a full metrics/logging API.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              React Frontend (Vercel)                        │
│         https://automation-saas-one.vercel.app              │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS + JWT
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            Express API  ─  src/server.js                    │
│                                                             │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  Auth        │  │  Automations   │  │  Logs/Metrics  │  │
│  │  Controller  │  │  Controller    │  │  Controller    │  │
│  └──────┬───────┘  └───────┬────────┘  └───────┬────────┘  │
│         └─────────────────►▼◄──────────────────┘           │
│                     Sequelize ORM                           │
└───────────────────────┬─────────────────────────────────────┘
        ┌──────────────┴────────────────┐
        ▼                               ▼
┌──────────────────┐         ┌──────────────────────┐
│  Supabase        │         │  Upstash Redis        │
│  PostgreSQL      │         │  BullMQ Queue         │
│  (Users,         │         │  (Job scheduling +    │
│  Automations,    │         │   caching)            │
│  Logs)           │         └──────────┬────────────┘
└──────────────────┘                    │
                                        ▼
                          ┌─────────────────────────┐
                          │    Cron Scheduler        │
                          │  node-cron (every min)   │
                          │  → adds jobs to queue    │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌─────────────────────────┐
                          │   BullMQ Worker          │
                          │   concurrency: 3         │
                          │   retries: 3 (exp. backoff)│
                          │                          │
                          │  ┌─────────────────────┐ │
                          │  │ WEBSITE_UPTIME       │ │
                          │  │ Puppeteer + metrics  │ │
                          │  ├─────────────────────┤ │
                          │  │ PRICE_MONITOR        │ │
                          │  │ CSS selector scraper │ │
                          │  ├─────────────────────┤ │
                          │  │ JOB_MONITOR          │ │
                          │  │ Careers page scraper │ │
                          │  └─────────────────────┘ │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌─────────────────────────┐
                          │   Nodemailer (Gmail)     │
                          │   Email notifications    │
                          └─────────────────────────┘
```

---

## 🎯 Automation Use Cases

### 1. WEBSITE_UPTIME

Monitors a website's availability using Puppeteer. Measures HTTP status, response time, and page content. Classifies health as **Healthy / Degraded / Unhealthy** and sends email report.

**Config:** `{ url: "https://example.com" }`

---

### 2. PRICE_MONITOR

Scrapes a product page price via a CSS selector. Compares against a target price threshold. Sends email alert when price drops to or below target. Also tracks price changes across runs.

**Config:** `{ url, selector, targetPrice }`

---

### 3. JOB_MONITOR

Scrapes a careers page listing via CSS selector. Detects new job postings by comparing titles across runs. Optionally filters by keyword. Sends email alert listing all new job titles.

**Config:** `{ url, selector, keyword? }`

---

## 🧩 Tech Stack

| Technology                | Purpose                                                      |
| ------------------------- | ------------------------------------------------------------ |
| **Node.js 20**            | Runtime                                                      |
| **Express 5**             | Web framework                                                |
| **Sequelize 6**           | PostgreSQL ORM — models, relationships, migrations           |
| **PostgreSQL (Supabase)** | Primary database — users, automations, execution logs        |
| **Redis (Upstash)**       | BullMQ queue transport + caching                             |
| **BullMQ**                | Job queue — dispatching, retries, concurrency                |
| **node-cron**             | Cron scheduler — evaluates automation schedules every minute |
| **Puppeteer**             | Headless browser — powers Uptime, Price, and Job handlers    |
| **JWT + bcrypt**          | Authentication and password hashing                          |
| **Nodemailer**            | Email notifications via Gmail SMTP                           |
| **Winston**               | Structured logging to console and files                      |
| **Helmet + CORS**         | HTTP security headers and origin control                     |
| **express-rate-limit**    | API rate limiting                                            |
| **Docker**                | Container-based deployment on Render                         |

---

## 📁 Folder Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js        # Sequelize setup — auto-SSL for Supabase URLs
│   │   ├── redis.js           # ioredis setup — auto-TLS for Upstash URLs
│   │   ├── development.js
│   │   ├── production.js
│   │   └── index.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── automation.controller.js
│   │   ├── logs.controller.js
│   │   └── metrics.controller.js
│   ├── handlers/
│   │   ├── uptime.handler.js        # Puppeteer-based uptime check
│   │   ├── priceMonitor.handler.js  # CSS selector price scraper
│   │   └── jobMonitor.handler.js    # Career page job count tracker
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── rateLimit.middleware.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── automation.model.js
│   │   ├── automationLog.model.js
│   │   └── index.model.js           # Relations + exports
│   ├── queues/
│   │   └── automation.queue.js      # BullMQ queue definition
│   ├── routes/
│   │   ├── index.routes.js
│   │   ├── auth.routes.js
│   │   ├── automation.routes.js
│   │   ├── logs.routes.js
│   │   └── metrics.routes.js
│   ├── schedulers/
│   │   └── cron.scheduler.js        # node-cron scheduling engine
│   ├── services/
│   │   ├── automation.service.js
│   │   ├── email.service.js
│   │   └── metrics.service.js
│   ├── utils/
│   │   ├── logger.util.js
│   │   ├── automationTypes.js
│   │   └── token.util.js
│   ├── workers/
│   │   └── automation.worker.js     # BullMQ worker + handler routing
│   └── server.js                    # Express app entry point
├── worker.js                        # Worker process entry point
├── Dockerfile                       # Docker image with Chromium
├── docker-compose.yml
└── tests/
    ├── auth.test.js
    └── automation.test.js
```

---

## 🔄 Runtime Workflows

### Scheduling Flow

```
Every 60s: cron.scheduler.js
  → Fetch all active automations from DB
  → Parse each cron expression
  → If due (within 60s window) → push job to BullMQ queue
     → jobId = "automation-{id}" (deduplication)
     → retries: 3, backoff: exponential starting at 2s
```

### Job Execution Flow

```
BullMQ Worker (concurrency: 3)
  → Pick job from queue
  → Load Automation + User from DB
  → Route to handler by automationType
  → Execute handler (Puppeteer / scraper logic)
  → Write AutomationLog (success/failed)
  → Send email notification
  → On error: re-throw → BullMQ retries (up to 3 attempts)
  → After 3 failures: email sent to user
```

### Worker Startup Flow (worker.js)

```
startWorker()
  → await sequelize.authenticate()   ← DB confirmed before anything starts
  → dynamic import automation.worker.js
  → register SIGTERM handler for graceful shutdown
```

---

## 📡 API Reference

**Base URL:** `https://your-render-api.onrender.com/api/v1`

### Auth

| Method | Route                  | Auth | Description        |
| ------ | ---------------------- | ---- | ------------------ |
| POST   | `/auth/users/register` | No   | Register new user  |
| POST   | `/auth/users/login`    | No   | Login, returns JWT |
| POST   | `/auth/users/logout`   | Yes  | Logout             |
| GET    | `/auth/users/profile`  | Yes  | Get profile        |
| PUT    | `/auth/users/profile`  | Yes  | Update profile     |
| DELETE | `/auth/users/profile`  | Yes  | Delete account     |

### Automations

| Method | Route                            | Auth | Description            |
| ------ | -------------------------------- | ---- | ---------------------- |
| POST   | `/automations/create-automation` | Yes  | Create automation      |
| GET    | `/automations`                   | Yes  | List all automations   |
| GET    | `/automations/:id`               | Yes  | Get single automation  |
| PUT    | `/automations/:id`               | Yes  | Update automation      |
| PATCH  | `/automations/:id/toggle`        | Yes  | Toggle active/inactive |
| DELETE | `/automations/:id`               | Yes  | Delete automation      |

### Logs

| Method | Route                          | Auth | Description                  |
| ------ | ------------------------------ | ---- | ---------------------------- |
| GET    | `/logs?limit=100`              | Yes  | All execution logs           |
| GET    | `/logs/:automationId?limit=50` | Yes  | Logs for specific automation |
| GET    | `/logs/stats`                  | Yes  | Aggregate log statistics     |

### Metrics

| Method | Route                    | Auth | Description               |
| ------ | ------------------------ | ---- | ------------------------- |
| GET    | `/metrics?timeRange=24h` | Yes  | Queue + execution metrics |

### Response Format

```json
// Success
{ "success": true, "data": {} }

// Error
{ "success": false, "message": "Human readable error" }
```

---

## 🚀 Local Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ OR Supabase account
- Redis 7+ OR Upstash account

### Steps

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev          # Start API
npm run worker       # Start worker (separate terminal)
```

---

## 🌐 Production Deployment (Render + Docker)

Both the API and Worker use the same Docker image. The Dockerfile installs Chromium for Puppeteer.

### API Service (Web Service)

| Field          | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Environment    | Docker                                                 |
| Docker Command | _(leave empty — uses `CMD ["node", "src/server.js"]`)_ |
| Port           | 3000                                                   |

### Worker (same service, `RUN_WORKER_IN_API=true`)

The cheapest option is to run the worker **inside the API process** using the built-in flag:

```env
RUN_WORKER_IN_API=true
```

This starts the BullMQ worker in the same Node.js process as Express — no extra service needed.

### Required Environment Variables on Render

```env
NODE_ENV=production
PORT=3000
RUN_WORKER_IN_API=true
CORS_ORIGINS=https://automation-saas-one.vercel.app
DATABASE_URL=postgresql://...supabase.com.../postgres
REDIS_URL=redis://default:...@....upstash.io:6379
JWT_SECRET=your-strong-secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Automation SaaS your@gmail.com"
LOG_LEVEL=info
GROQ_API_KEY=optional
```

---

## 🔒 Key Production Fixes Made

### 1. Automatic SSL for Supabase (`src/config/database.js`)

Supabase requires TLS for all remote connections. The config now automatically enables SSL when `DATABASE_URL` contains `supabase.com` — no manual flag needed.

```js
const sslEnabled =
  process.env.DB_SSL === "true" ||
  (process.env.DATABASE_URL &&
    process.env.DATABASE_URL.includes("supabase.com"));
```

### 2. Automatic TLS for Upstash (`src/config/redis.js`)

Upstash Redis requires TLS. The config now auto-applies TLS when `REDIS_URL` contains `upstash.io`.

```js
tls: process.env.REDIS_TLS === "true" ||
process.env.REDIS_URL.includes("upstash.io")
  ? { rejectUnauthorized: false }
  : undefined;
```

### 3. Fixed ES Module Import Order (`src/server.js`, `worker.js`)

ES module `import` statements are hoisted — changing from `dotenv.config()` to `import 'dotenv/config'` ensures environment variables are always loaded before any module initializes.

```js
// Before (broken in ES modules)
import dotenv from "dotenv";
dotenv.config();
import sequelize from "./config/database.js"; // ← runs before dotenv!

// After (correct)
import "dotenv/config";
import sequelize from "./config/database.js"; // ← env already loaded
```

### 4. Safe Worker Startup (`worker.js`)

Rewrote `worker.js` to use an `async startWorker()` function. The BullMQ worker now only starts **after** the DB connection is confirmed. Includes graceful `SIGTERM` shutdown for clean Render deploys.

---

## 🗄️ Data Model

### User

- `id`, `email`, `password` (hashed), `name`, `plan`

### Automation

- `id`, `userId`, `name`, `schedule` (cron), `isActive`
- `automationType` (`WEBSITE_UPTIME` | `PRICE_MONITOR` | `JOB_MONITOR`)
- `config` (JSON) — type-specific config
- `automationState` (JSON) — persisted state between runs (previous price, last job count)
- `targetUrl` (legacy compat)

### AutomationLog

- `id`, `automationId`, `status` (`success` | `failed`)
- `result` (JSON) — full execution output (metrics, timings, etc.)
- `error` (string)
- `createdAt`

---

## 🧪 Testing

```bash
npm test                # Run Jest + Supertest integration tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

Test files:

- `tests/auth.test.js` — registration, login, profile access
- `tests/automation.test.js` — CRUD, validation, plan limits

---

## 📊 Monitoring

- **Logs:** Winston writes to `logs/combined.log` and `logs/error.log`
- **Metrics API:** `GET /api/v1/metrics` — queue counts, success rates, execution times
- **Health:** `GET /` — returns API readiness message
- **Metrics auto-log:** Every 5 minutes, system metrics are logged internally

---

## 🛡️ Security

- `helmet` — sets secure HTTP headers
- `cors` — restricts to configured origins
- `express-rate-limit` — global rate limiting
- `bcrypt` — password hashing (salt rounds: 10)
- JWT with expiry
- SSL/TLS enforced for all managed service connections

---

_Part of the Automation SaaS platform. Frontend lives at [https://automation-saas-one.vercel.app/](https://automation-saas-one.vercel.app/)_
