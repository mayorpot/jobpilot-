import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";

export const RESUME_QUEUE_NAME = "resume-processing";

export type ResumeProcessingJob = {
  resumeId: string;
  userId: string;
};

export const resumeQueue = new Queue<ResumeProcessingJob>(
  RESUME_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  }
);