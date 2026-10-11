
import { Router } from "express";
import { prisma } from "@jobpilot/db";
import { requireAuth, type AuthenticatedRequest } from "../auth/auth.middleware.js";
import { refreshCandidateMatches } from "./matching.service.js";

const router = Router();

router.use(requireAuth);

router.post("/refresh", async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const result = await refreshCandidateMatches(req.userId);
    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to refresh matches";

    if (message.includes("Complete your candidate profile")) {
      res.status(400).json({ error: message });
      return;
    }

    console.error("[matches-api] Refresh failed:", error);
    res.status(500).json({ error: "Unable to refresh job matches" });
  }
});

router.get("/", async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsedLimit = Number(req.query.limit ?? 25);
  const limit = Number.isInteger(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100)
    : 25;

  const parsedPage = Number(req.query.page ?? 1);
  const page = Number.isInteger(parsedPage)
    ? Math.max(parsedPage, 1)
    : 1;

  try {
    const [total, matches] = await prisma.$transaction([
      prisma.jobMatch.count({
        where: {
          userId: req.userId,
          job: { status: "ACTIVE" },
        },
      }),
      prisma.jobMatch.findMany({
        where: {
          userId: req.userId,
          job: { status: "ACTIVE" },
        },
        include: {
          job: {
            include: {
              company: { select: { name: true, website: true } },
              source: { select: { name: true, type: true } },
              verificationResults: {
                orderBy: { checkedAt: "desc" },
                take: 1,
                select: {
                  confidence: true,
                  isVerified: true,
                  riskFlags: true,
                  checkedAt: true,
                },
              },
            },
          },
        },
        orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      data: matches.map((match) => ({
        id: match.id,
        score: match.score,
        reasoning: match.reasoning,
        updatedAt: match.updatedAt,
        job: {
          id: match.job.id,
          title: match.job.title,
          location: match.job.location,
          employmentType: match.job.employmentType,
          remoteType: match.job.remoteType,
          canonicalUrl: match.job.canonicalUrl,
          applicationUrl: match.job.applicationUrl,
          postedAt: match.job.postedAt,
          company: match.job.company,
          source: match.job.source,
          description: match.job.description,
          discoveredAt: match.job.discoveredAt,
          verification: match.job.verificationResults[0] ?? null,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[matches-api] Listing failed:", error);
    res.status(500).json({ error: "Unable to retrieve job matches" });
  }
});

export default router;
