
import { Worker } from "bullmq";
import { prisma } from "@jobpilot/db";
import { GeminiResumeAIProvider } from "@jobpilot/ai";

import { redisConnection } from "./redis.js";

const RESUME_QUEUE_NAME = "resume-processing";

type ResumeProcessingJob = {
  resumeId: string;
  userId: string;
};

const resumeAI = new GeminiResumeAIProvider();

export const resumeWorker = new Worker<ResumeProcessingJob>(
  RESUME_QUEUE_NAME,
  async (job) => {
    const { resumeId, userId } = job.data;

    console.log(
      `[resume-worker] Processing resume ${resumeId}`
    );

    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId,
      },
    });

    if (!resume) {
      throw new Error(`Resume ${resumeId} was not found`);
    }

    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        processingStatus: "PROCESSING",
        processingError: null,
      },
    });

    try {
      if (!resume.extractedText?.trim()) {
        throw new Error("Resume has no extracted text");
      }

      console.log(
        `[resume-worker] Analyzing resume ${resumeId} with AI`
      );

      const analysis = await resumeAI.analyzeResume({
        resumeText: resume.extractedText,
      });

      // Persist the validated AI response. JSON serialization
      // ensures this is stored as JSON-compatible data.
      const structuredData = JSON.parse(
        JSON.stringify(analysis)
      );

      await prisma.resume.update({
        where: { id: resumeId },
        data: {
          structuredData,
          processingStatus: "COMPLETED",
          processedAt: new Date(),
          processingError: null,
        },
      });

      console.log(
        `[resume-worker] Completed resume ${resumeId}`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown resume processing error";

      await prisma.resume.update({
        where: { id: resumeId },
        data: {
          processingStatus: "FAILED",
          processingError: message.slice(0, 1000),
        },
      });

      console.error(
        `[resume-worker] Failed resume ${resumeId}: ${message}`
      );

      // BullMQ can retry this job according to the queue settings.
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

resumeWorker.on("completed", (job) => {
  console.log(`[resume-worker] Job ${job.id} completed`);
});

resumeWorker.on("failed", (job, error) => {
  console.error(
    `[resume-worker] Job ${job?.id} failed:`,
    error.message
  );
});
