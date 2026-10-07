import { Router } from "express";
import multer from "multer";
import { prisma } from "@jobpilot/db";

import {
  AuthenticatedRequest,
  requireAuth
} from "../auth/auth.middleware.js";

import {
  createResumeDownloadUrl,
  deleteResumeFile,
  uploadResume
} from "./resume.storage.js";

const router = Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

router.post(
  "/",
  requireAuth,
  upload.single("resume"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: "A resume file is required"
        });
      }

      if (!allowedTypes.has(file.mimetype)) {
        return res.status(415).json({
          error: "Only PDF and DOCX files are supported"
        });
      }

      const uploaded = await uploadResume(
        req.userId!,
        file.originalname,
        file.buffer,
        file.mimetype
      );

      try {
        const resume = await prisma.$transaction(async (tx) => {
          await tx.resume.updateMany({
            where: {
              userId: req.userId!,
              isPrimary: true
            },
            data: {
              isPrimary: false
            }
          });

          const existingCount = await tx.resume.count({
            where: { userId: req.userId! }
          });

          return tx.resume.create({
            data: {
              userId: req.userId!,
              fileName: file.originalname,
              storagePath: uploaded.storagePath,
              mimeType: file.mimetype,
              fileSize: file.size,
              version: existingCount + 1,
              isPrimary: true
            },
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
              version: true,
              isPrimary: true,
              createdAt: true
            }
          });
        });

        return res.status(201).json({ resume });
      } catch (databaseError) {
        await deleteResumeFile(uploaded.storagePath).catch(console.error);
        throw databaseError;
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to upload resume"
      });
    }
  }
);

router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const resumes = await prisma.resume.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        version: true,
        isPrimary: true,
        createdAt: true
      }
    });

    return res.json({ resumes });
  }
);

router.get(
  "/:id/download",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const resumeId = req.params.id;

    if (typeof resumeId !== "string" || !resumeId) {
      return res.status(400).json({
        error: "Resume ID is required"
      });
    }

    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId: req.userId!
      },
      select: {
        storagePath: true
      }
    });

    if (!resume) {
      return res.status(404).json({
        error: "Resume not found"
      });
    }

    try {
      const url = await createResumeDownloadUrl(resume.storagePath);
      return res.json({ url });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to create download link"
      });
    }
  }
);

export default router;