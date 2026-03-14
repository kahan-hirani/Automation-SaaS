import { Redis } from "ioredis";

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    tls: (process.env.REDIS_TLS === "true" || process.env.REDIS_URL.includes("upstash.io")) ? { rejectUnauthorized: false } : undefined,
  })
  : new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    maxRetriesPerRequest: null,
  });

export default redis;