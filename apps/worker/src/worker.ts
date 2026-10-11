import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

const { redisConnection } = await import("./redis.js");
const { Queue } = await import("bullmq");

const [
  { resumeWorker },
  { discoveryWorker, DISCOVERY_QUEUE_NAME },
  { verificationWorker, VERIFICATION_QUEUE_NAME },
] = await Promise.all([
  import("./resume.worker.js"),
  import("./discovery/discovery.worker.js"),
  import("./verification/verification.worker.js"),
]);

const discoveryQueue = new Queue(DISCOVERY_QUEUE_NAME, {
  connection: redisConnection,
});

await discoveryQueue.upsertJobScheduler(
  "job-discovery-every-30-minutes",
  { every: 30 * 60 * 1000 },
  { name: "discover-jobs", data: {} },
);

const verificationQueue = new Queue(VERIFICATION_QUEUE_NAME, {
  connection: redisConnection,
});

await verificationQueue.upsertJobScheduler(
  "job-verification-every-15-minutes",
  { every: 15 * 60 * 1000 },
  {
    name: "verify-active-jobs",
    data: {},
  },
);

console.log("JobPilot workers started");
console.log("Job discovery is scheduled every 30 minutes");
console.log("Job verification is scheduled every 15 minutes");

resumeWorker.on("error", (error) => {
  console.error("[resume-worker] Worker error:", error);
});

discoveryWorker.on("error", (error) => {
  console.error("[discovery-worker] Worker error:", error);
});

verificationWorker.on("error", (error) => {
  console.error("[verification-worker] Worker error:", error);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down workers...`);
  await Promise.all([
    resumeWorker.close(),
    discoveryWorker.close(),
    verificationWorker.close(),
    discoveryQueue.close(),
    verificationQueue.close(),
  ]);
  await redisConnection.quit();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));