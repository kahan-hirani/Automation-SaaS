import { Queue } from "bullmq";
import redis from "../config/redis.js";

const automationQueue = new Queue("automationQueue", {
  connection: redis
});

export default automationQueue;