import { Router } from "express";

import {
  AuthenticatedRequest,
  requireAuth
} from "../auth/auth.middleware.js";

import { prisma } from "@jobpilot/db";

const router = Router();

router.get(
  "/profile",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const profile = await prisma.candidateProfile.findUnique({
      where: {
        userId: req.userId
      }
    });

    return res.json({
      profile
    });
  }
);

router.put(
  "/profile",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const {
      headline,
      summary,
      location,
      yearsExperience,
      targetRoles,
      preferredLocations,
      skills,
      industries,
      employmentTypes,
      remotePreference
    } = req.body;

    const profile = await prisma.candidateProfile.upsert({
      where: {
        userId: req.userId!
      },
      create: {
        userId: req.userId!,
        headline,
        summary,
        location,
        yearsExperience,
        targetRoles: targetRoles ?? [],
        preferredLocations: preferredLocations ?? [],
        skills: skills ?? [],
        industries: industries ?? [],
        employmentTypes: employmentTypes ?? [],
        remotePreference
      },
      update: {
        headline,
        summary,
        location,
        yearsExperience,
        targetRoles: targetRoles ?? [],
        preferredLocations: preferredLocations ?? [],
        skills: skills ?? [],
        industries: industries ?? [],
        employmentTypes: employmentTypes ?? [],
        remotePreference
      }
    });

    return res.json({
      profile
    });
  }
);

export default router;