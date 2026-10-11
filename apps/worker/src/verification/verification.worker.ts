
import { Worker } from "bullmq";
import { redisConnection } from "../redis.js";
import { verifyActiveJobs } from "./verification.service.js";

export const VERIFICATION_QUEUE_NAME = "job-verification";

export const verificationWorker = new Worker(
  VERIFICATION_QUEUE_NAME,
  async () => {
    console.log("[verification] Starting scheduled verification");
    return verifyActiveJobs(100);
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

verificationWorker.on("completed", (job) => {
  console.log(`[verification] Job ${job.id} completed`, job.returnvalue);
});

verificationWorker.on("failed", (job, error) => {
  console.error(`[verification] Job ${job?.id} failed:`, error.message);
});

verificationWorker.on("error", (error) => {
  console.error("[verification] Worker error:", error);
});
