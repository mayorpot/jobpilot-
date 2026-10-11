
import { Worker } from "bullmq";
import { redisConnection } from "../redis.js";
import { runJobDiscovery } from "./discovery.service.js";

export const DISCOVERY_QUEUE_NAME = "job-discovery";

export const discoveryWorker = new Worker(
  DISCOVERY_QUEUE_NAME,
  async () => {
    console.log("[job-discovery] Starting scheduled discovery");
    const results = await runJobDiscovery();
    console.log("[job-discovery] Run finished", results);
    return results;
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

discoveryWorker.on("completed", (job) => {
  console.log(`[job-discovery] Job ${job.id} completed`);
});

discoveryWorker.on("failed", (job, error) => {
  console.error(`[job-discovery] Job ${job?.id} failed:`, error.message);
});

discoveryWorker.on("error", (error) => {
  console.error("[job-discovery] Worker error:", error);
});
