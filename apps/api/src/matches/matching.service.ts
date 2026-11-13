import { prisma } from "@jobpilot/db";

type CandidateData = {
  targetRoles: string[];
  preferredLocations: string[];
  skills: string[];
  industries: string[];
  employmentTypes: string[];
  location: string | null;
  remotePreference: string | null;
  yearsExperience: number | null;
};

type MatchDimension = {
  name: string;
  score: number;
  weight: number;
  explanation: string;
};

type JobData = {
  title: string;
  description: string;
  location: string | null;
  employmentType: string | null;
  remoteType: string | null;
  companyName: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

function uniqueStrings(values: unknown[]): string[] {
  return [
    ...new Set(
      values
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .map((value) => value.trim()),
    ),
  ];
}

function includesAny(text: string, terms: string[]): string[] {
  const normalizedText = ` ${normalize(text)} `;

  return terms.filter((term) => {
    const normalizedTerm = normalize(term);

    return (
      normalizedTerm.length > 0 &&
      normalizedText.includes(` ${normalizedTerm} `)
    );
  });
}

function getResumeSkills(structuredData: unknown): string[] {
  if (!structuredData || typeof structuredData !== "object") {
    return [];
  }

  const data = structuredData as Record<string, unknown>;

  return Array.isArray(data.skills)
    ? uniqueStrings(data.skills)
    : [];
}

function getResumeRoles(structuredData: unknown): string[] {
  if (!structuredData || typeof structuredData !== "object") {
    return [];
  }

  const data = structuredData as Record<string, unknown>;

  return Array.isArray(data.targetRoles)
    ? uniqueStrings(data.targetRoles)
    : [];
}

function scoreDimension(
  name: string,
  score: number,
  weight: number,
  explanation: string,
): MatchDimension {
  return {
    name,
    score: Math.max(0, Math.min(100, Math.round(score))),
    weight,
    explanation,
  };
}

function matchesTerm(text: string, term: string): boolean {
  const normalizedText = ` ${normalize(text)} `;
  const normalizedTerm = normalize(term);

  return (
    normalizedTerm.length > 0 &&
    normalizedText.includes(` ${normalizedTerm} `)
  );
}

function getExperienceRequirement(text: string): number | null {
  const patterns = [
    /(\d+)\s*(?:\+|plus)?\s*years?\s+(?:of\s+)?experience/i,
    /minimum\s+(?:of\s+)?(\d+)\s*years?/i,
    /at\s+least\s+(\d+)\s*years?/i,
    /(\d+)\s*-\s*\d+\s*years?\s+(?:of\s+)?experience/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      const years = Number(match[1]);

      if (Number.isFinite(years) && years >= 0 && years <= 50) {
        return years;
      }
    }
  }

  return null;
}

function calculateMatch(candidate: CandidateData, job: JobData) {
  const jobText = `${job.title} ${job.description} ${job.companyName}`;
  const dimensions: MatchDimension[] = [];

  // 1. Skills alignment
  const candidateSkills = uniqueStrings(candidate.skills);
  const foundSkills = includesAny(jobText, candidateSkills);

  if (candidateSkills.length > 0) {
    const skillScore =
      (foundSkills.length / candidateSkills.length) * 100;

    dimensions.push(
      scoreDimension(
        "skills",
        skillScore,
        40,
        foundSkills.length
          ? `Found ${foundSkills.length} of ${candidateSkills.length} candidate skills: ${foundSkills.join(", ")}.`
          : "None of the candidate's listed skills were explicitly identified in the job description.",
      ),
    );
  }

  // 2. Target role alignment
  const targetRoles = uniqueStrings(candidate.targetRoles);

  if (targetRoles.length > 0) {
    const matchingRoles = targetRoles.filter(
      (role) =>
        matchesTerm(job.title, role) ||
        matchesTerm(role, job.title),
    );

    const roleScore = matchingRoles.length > 0 ? 100 : 0;

    dimensions.push(
      scoreDimension(
        "role",
        roleScore,
        25,
        matchingRoles.length
          ? `The job title aligns with your target role: ${matchingRoles.join(", ")}.`
          : "No direct match was found between the job title and your target roles.",
      ),
    );
  }

  // 3. Location alignment
  const locationTerms = uniqueStrings([
    ...candidate.preferredLocations,
    ...(candidate.location ? [candidate.location] : []),
  ]);

  if (locationTerms.length > 0 && job.location) {
    const normalizedJobLocation = normalize(job.location);

    const matchingLocations = locationTerms.filter((location) => {
      const normalizedLocation = normalize(location);

      return (
        normalizedJobLocation.includes(normalizedLocation) ||
        normalizedLocation.includes(normalizedJobLocation)
      );
    });

    const remoteListing = normalize(
      `${job.remoteType ?? ""} ${job.description}`,
    ).includes("remote");

    dimensions.push(
      scoreDimension(
        "location",
        matchingLocations.length > 0 ? 100 : remoteListing ? 70 : 0,
        15,
        matchingLocations.length
          ? `The job location matches your preferences: ${matchingLocations.join(", ")}.`
          : remoteListing
            ? "The listing mentions remote work, but eligibility in your country still needs confirmation."
            : `No clear match was found for the listed location: ${job.location}.`,
      ),
    );
  }

  // 4. Employment type alignment
  const employmentTypes = uniqueStrings(candidate.employmentTypes);

  if (employmentTypes.length > 0 && job.employmentType) {
    const matchingTypes = employmentTypes.filter((type) => {
      const normalizedType = normalize(type);
      const normalizedJobType = normalize(job.employmentType!);

      return (
        normalizedJobType.includes(normalizedType) ||
        normalizedType.includes(normalizedJobType)
      );
    });

    dimensions.push(
      scoreDimension(
        "employmentType",
        matchingTypes.length > 0 ? 100 : 0,
        8,
        matchingTypes.length
          ? `Employment type matches your preferences: ${matchingTypes.join(", ")}.`
          : `The listed employment type (${job.employmentType}) does not match your preferences.`,
      ),
    );
  }

  // 5. Industry alignment
  const industries = uniqueStrings(candidate.industries);

  if (industries.length > 0) {
    const matchingIndustries = industries.filter((industry) =>
      matchesTerm(jobText, industry),
    );

    dimensions.push(
      scoreDimension(
        "industry",
        matchingIndustries.length > 0 ? 100 : 0,
        7,
        matchingIndustries.length
          ? `The job description contains industry terms matching your interests: ${matchingIndustries.join(", ")}.`
          : "No direct industry keyword match was found in the listing.",
      ),
    );
  }

  // 6. Experience alignment
  const requiredExperience = getExperienceRequirement(job.description);

  if (
    candidate.yearsExperience !== null &&
    candidate.yearsExperience >= 0 &&
    requiredExperience !== null
  ) {
    const experienceScore =
      candidate.yearsExperience >= requiredExperience
        ? 100
        : requiredExperience === 0
          ? 100
          : Math.round(
              (candidate.yearsExperience / requiredExperience) * 100,
            );

    dimensions.push(
      scoreDimension(
        "experience",
        experienceScore,
        5,
        candidate.yearsExperience >= requiredExperience
          ? `Your ${candidate.yearsExperience} years of experience meets the stated ${requiredExperience}-year requirement.`
          : `Your ${candidate.yearsExperience} years of experience is below the stated ${requiredExperience}-year requirement.`,
      ),
    );
  }

  // 7. Remote-work preference
  const remotePreference = normalize(candidate.remotePreference ?? "");
  const jobRemoteType = normalize(job.remoteType ?? "");

  if (remotePreference && job.remoteType) {
    let remoteScore: number | null = null;

    if (
      remotePreference.includes("any") ||
      remotePreference.includes("flexible")
    ) {
      remoteScore = 100;
    } else if (
      remotePreference.includes("remote") &&
      jobRemoteType.includes("remote")
    ) {
      remoteScore = 100;
    } else if (
      remotePreference.includes("hybrid") &&
      jobRemoteType.includes("hybrid")
    ) {
      remoteScore = 100;
    } else if (
      remotePreference.includes("onsite") &&
      (jobRemoteType.includes("onsite") ||
        jobRemoteType.includes("on site") ||
        jobRemoteType.includes("office"))
    ) {
      remoteScore = 100;
    } else {
      remoteScore = 0;
    }

    dimensions.push(
      scoreDimension(
        "remotePreference",
        remoteScore,
        5,
        remoteScore === 100
          ? "The work arrangement matches your remote-work preference."
          : "The listed work arrangement differs from your remote-work preference.",
      ),
    );
  }

  // Calculate a weighted score using only dimensions with sufficient data.
  const totalWeight = dimensions.reduce(
    (sum, dimension) => sum + dimension.weight,
    0,
  );

  const score =
    totalWeight === 0
      ? 0
      : Math.round(
          dimensions.reduce(
            (sum, dimension) =>
              sum + dimension.score * dimension.weight,
            0,
          ) / totalWeight,
        );

  const reasoning =
    totalWeight === 0
      ? "There is not enough profile information to calculate a meaningful match. Add your skills, target roles, or career preferences."
      : dimensions.map((dimension) => dimension.explanation).join(" ");

  return {
    score,
    reasoning,
    dimensions,
  };
}

export async function refreshCandidateMatches(userId: string) {
  const [profile, resumes] = await Promise.all([
    prisma.candidateProfile.findUnique({
      where: { userId },
    }),

    prisma.resume.findMany({
      where: {
        userId,
        isPrimary: true,
        processingStatus: "COMPLETED",
      },
      select: {
        structuredData: true,
      },
      take: 1,
    }),
  ]);

  if (!profile) {
    throw new Error(
      "Complete your candidate profile before refreshing job matches.",
    );
  }

  const resumeData = resumes[0]?.structuredData;

  const candidate: CandidateData = {
    targetRoles: uniqueStrings([
      ...profile.targetRoles,
      ...getResumeRoles(resumeData),
    ]),

    preferredLocations: profile.preferredLocations,

    skills: uniqueStrings([
      ...profile.skills,
      ...getResumeSkills(resumeData),
    ]),

    industries: profile.industries,

    employmentTypes: profile.employmentTypes,

    location: profile.location,

    remotePreference: profile.remotePreference,

    yearsExperience: profile.yearsExperience,
  };

  // Process every active vacancy in manageable batches.
  const BATCH_SIZE = 250;
  const CONCURRENCY = 10;

  let cursor: { id: string } | undefined;
  let jobsConsidered = 0;
  let matchesUpdated = 0;
  let batchesProcessed = 0;

  while (true) {
    const jobs = await prisma.job.findMany({
      where: {
        status: "ACTIVE",
      },

      include: {
        company: {
          select: {
            name: true,
          },
        },
      },

      orderBy: [
        { discoveredAt: "desc" },
        { id: "desc" },
      ],

      take: BATCH_SIZE,

      ...(cursor
        ? {
            cursor,
            skip: 1,
          }
        : {}),
    });

    if (jobs.length === 0) {
      break;
    }

    jobsConsidered += jobs.length;
    batchesProcessed++;

    // Process a small number of database writes concurrently.
    for (
      let offset = 0;
      offset < jobs.length;
      offset += CONCURRENCY
    ) {
      const chunk = jobs.slice(offset, offset + CONCURRENCY);

      await Promise.all(
        chunk.map(async (job) => {
          const match = calculateMatch(candidate, {
            title: job.title,
            description: job.description,
            location: job.location,
            employmentType: job.employmentType,
            remoteType: job.remoteType,
            companyName: job.company.name,
          });

          await prisma.jobMatch.upsert({
            where: {
              userId_jobId: {
                userId,
                jobId: job.id,
              },
            },

            create: {
              userId,
              jobId: job.id,
              score: match.score,
              reasoning: JSON.stringify({
                summary: match.reasoning,
                dimensions: match.dimensions,
                version: 2,
              }),
            },

            update: {
              score: match.score,
              reasoning: JSON.stringify({
                summary: match.reasoning,
                dimensions: match.dimensions,
                version: 2,
              }),
            },
          });
        }),
      );

      matchesUpdated += chunk.length;
    }

    // Remember the last processed job for the next database page.
    cursor = {
      id: jobs[jobs.length - 1].id,
    };

    console.log(
      `[matching] Batch ${batchesProcessed} processed. ` +
      `${jobsConsidered} jobs considered so far.`,
    );

    if (jobs.length < BATCH_SIZE) {
      break;
    }
  }

  console.log(
    `[matching] Completed for user ${userId}. ` +
    `${matchesUpdated} matches updated across ${batchesProcessed} batches.`,
  );

  return {
    jobsConsidered,
    matchesUpdated,
    batchesProcessed,
    resumeUsed: Boolean(resumeData),
  };
}