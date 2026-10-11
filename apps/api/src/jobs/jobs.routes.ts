
import { Router } from "express";
import { prisma } from "@jobpilot/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const location =
      typeof req.query.location === "string" ? req.query.location.trim() : "";
    const remote =
      typeof req.query.remote === "string" ? req.query.remote.trim() : "";

    const parsedLimit = Number(req.query.limit ?? 25);
    const limit = Number.isInteger(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 25;

    const parsedPage = Number(req.query.page ?? 1);
    const page = Number.isInteger(parsedPage)
      ? Math.max(parsedPage, 1)
      : 1;

    const where = {
      status: "ACTIVE" as const,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { company: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(location
        ? { location: { contains: location, mode: "insensitive" as const } }
        : {}),
      ...(remote
        ? { remoteType: { contains: remote, mode: "insensitive" as const } }
        : {}),
    };

    const [total, jobs] = await prisma.$transaction([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        include: {
          company: {
            select: { name: true, website: true, careersUrl: true },
          },
          source: {
            select: { name: true, type: true },
          },
          verificationResults: {
            orderBy: { checkedAt: "desc" },
            take: 1,
            select: {
              confidence: true,
              isVerified: true,
              evidence: true,
              riskFlags: true,
              checkedAt: true,
            },
          },
        },
        orderBy: [{ postedAt: "desc" }, { discoveredAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      data: jobs.map((job) => {
        const verification = job.verificationResults[0] ?? null;

        return {
          id: job.id,
          title: job.title,
          description: job.description,
          location: job.location,
          employmentType: job.employmentType,
          remoteType: job.remoteType,
          canonicalUrl: job.canonicalUrl,
          applicationUrl: job.applicationUrl,
          postedAt: job.postedAt,
          discoveredAt: job.discoveredAt,
          lastVerifiedAt: job.lastVerifiedAt,
          company: job.company,
          source: job.source,
          verification: verification
            ? {
                confidence: verification.confidence,
                isVerified: verification.isVerified,
                evidence: verification.evidence,
                riskFlags: verification.riskFlags,
                checkedAt: verification.checkedAt,
              }
            : null,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[jobs-api] Failed to list jobs:", error);
    res.status(500).json({ error: "Unable to retrieve jobs" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, status: "ACTIVE" },
      include: {
        company: true,
        source: { select: { name: true, type: true } },
        verificationResults: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const { verificationResults, ...jobDetails } = job;

    res.json({
      data: {
        ...jobDetails,
        verification: verificationResults[0] ?? null,
      },
    });
  } catch (error) {
    console.error("[jobs-api] Failed to retrieve job:", error);
    res.status(500).json({ error: "Unable to retrieve job" });
  }
});

export default router;
