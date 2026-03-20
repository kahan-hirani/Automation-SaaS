<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=230&color=0:0f172a,45:1d4ed8,100:0ea5e9&text=Automation%20SaaS%20API&fontColor=ffffff&fontSize=50&fontAlignY=36&animation=fadeIn&desc=Backend%20Scheduling%2C%20Queues%2C%20Monitoring&descAlignY=58&descSize=18" alt="Automation SaaS API banner" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=700&size=22&pause=1200&color=60A5FA&center=true&vCenter=true&width=900&lines=Express+5+API+for+automation+workflows;Cron+scheduler+%2B+BullMQ+workers+%2B+Puppeteer+handlers;Built+for+production+with+PostgreSQL%2C+Redis%2C+and+Docker" alt="Typing effect" />
</p>

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white" alt="Node" /></a>
  <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express-5-111827?logo=express&logoColor=white" alt="Express" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="https://redis.io/"><img src="https://img.shields.io/badge/Redis-Queue-DC382D?logo=redis&logoColor=white" alt="Redis" /></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" /></a>
</p>

## Live Frontend

https://automation-saas-one.vercel.app/

## API Base URL

`https://your-render-service.onrender.com/api/v1`

## Overview

This backend powers the Automation SaaS platform and is responsible for:
- User authentication and profile management
- Automation CRUD and scheduling
- Queue-based execution using BullMQ
- Puppeteer handlers for uptime, price, and job monitoring
- Execution logs, metrics endpoints, and notification emails

## Backend Stack

- Node.js 20
- Express 5
- Sequelize 6
- PostgreSQL (Supabase compatible)
- Redis (Upstash compatible)
- BullMQ
- node-cron
- Puppeteer
- JWT + bcrypt
- Nodemailer
- Winston
- Docker

## Architecture Snapshot

```text
Frontend (Vercel)
  -> Express API (/api/v1)
    -> PostgreSQL via Sequelize
    -> Redis queue via BullMQ
    -> Cron scheduler (every minute)
    -> Worker execution (Puppeteer handlers)
    -> Email notifications (Nodemailer)
```

## Automation Types

1. `WEBSITE_UPTIME`
- Checks website status and response behavior
- Persists results and sends alerts for issues

2. `PRICE_MONITOR`
- Scrapes a CSS selector for current price
- Compares with target price and sends alerts

3. `JOB_MONITOR`
- Tracks job listing updates on a careers page
- Sends notifications when new jobs are detected

## Folder Structure

```text
server/
├─ src/
│  ├─ config/
│  ├─ controllers/
│  ├─ handlers/
│  ├─ middlewares/
│  ├─ models/
│  ├─ queues/
│  ├─ routes/
│  ├─ schedulers/
│  ├─ services/
│  ├─ utils/
│  ├─ workers/
│  └─ server.js
├─ tests/
├─ worker.js
├─ docker-compose.yml
├─ Dockerfile
└─ package.json
```

## API Endpoints

Auth:
- `POST /auth/users/register`
- `POST /auth/users/login`
- `POST /auth/users/logout`
- `GET /auth/users/profile`
- `PUT /auth/users/profile`
- `DELETE /auth/users/profile`

Automations:
- `POST /automations/create-automation`
- `GET /automations`
- `GET /automations/:id`
- `PUT /automations/:id`
- `PATCH /automations/:id/toggle`
- `DELETE /automations/:id`

Logs:
- `GET /logs?limit=100`
- `GET /logs/:automationId?limit=50`
- `GET /logs/stats`

Metrics:
- `GET /metrics?timeRange=24h`

## Local Setup

Prerequisites:
- Node.js 20+
- PostgreSQL (or Supabase)
- Redis (or Upstash)

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

In another terminal, run the worker:

```bash
cd server
npm run worker
```

Default local port: `3000`

## Scripts

```bash
npm run start
npm run dev
npm run worker
npm run test
npm run test:watch
npm run test:coverage
npm run docker:build
npm run docker:up
npm run docker:down
npm run docker:logs
```

## Deployment Notes

For Render deployment:
- Set `PORT=3000`
- Set `NODE_ENV=production`
- Configure `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and SMTP variables
- Optionally run worker inside API with `RUN_WORKER_IN_API=true`

## Security and Reliability

- Helmet for security headers
- CORS allowlist support via `CORS_ORIGINS`
- Global rate limiting middleware
- Worker retries with exponential backoff
- Structured logs in `logs/combined.log` and `logs/error.log`

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=90&color=0:111827,100:1d4ed8&section=footer&text=Schedule.%20Execute.%20Observe.&fontColor=ffffff&fontSize=24" alt="Footer banner" />
</p>
