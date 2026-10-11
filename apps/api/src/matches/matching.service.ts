
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

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(
    values.filter((value): value is string =>
      typeof value === "string" && value.trim().length > 0
    ).map((value) => value.trim())
  )];
}

function includesAny(text: string, terms: string[]): string[] {
  const normalizedText = ` ${normalize(text)} `;

  return terms.filter((term) => {
    const normalizedTerm = normalize(term);
    return normalizedTerm.length > 0 &&
      normalizedText.includes(` ${normalizedTerm} `);
  });
}

function getResumeSkills(structuredData: unknown): string[] {
  if (!structuredData || typeof structuredData !== "object") return [];

  const data = structuredData as Record<string, unknown>;
  return Array.isArray(data.skills)
    ? uniqueStrings(data.skills)
    : [];
}

function getResumeRoles(structuredData: unknown): string[] {
  if (!structuredData || typeof structuredData !== "object") return [];

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

function calculateMatch(candidate: CandidateData, job: {
  title: string;
  description: string;
  location: string | null;
  employmentType: string | null;
  remoteType: string | null;
  companyName: string;
}) {
  const jobText = `${job.title} ${job.description} ${job.companyName}`;
  const normalizedJobText = normalize(jobText);
  const dimensions: MatchDimension[] = [];

  // Skills: compare profile and AI-extracted CV skills with the job text.
  const candidateSkills = uniqueStrings(candidate.skills);
  const foundSkills = includesAny(normalizedJobText, candidateSkills);

  if (candidateSkills.length > 0) {
    const skillScore = (foundSkills.length / candidateSkills.length) * 100;
    dimensions.push(scoreDimension(
      "skills",
      skillScore,
      50,
      foundSkills.length
        ? `Found ${foundSkills.length} of ${candidateSkills.length} candidate skills in the job text: ${foundSkills.join(", ")}.`
        : "None of the listed candidate skills were explicitly found in the job text."
    ));
  }

  // Role alignment: compare the target role with the job title.
  const roleTerms = uniqueStrings(candidate.targetRoles);
  const matchingRoles = roleTerms.filter((role) => {
    const normalizedRole = normalize(role);
    return normalizedRole.length > 0 &&
      (normalize(job.title).includes(normalizedRole) ||
        normalizedRole.includes(normalize(job.title)));
  });

  if (roleTerms.length > 0) {
    dimensions.push(scoreDimension(
      "role",
      (matchingRoles.length / roleTerms.length) * 100,
      25,
      matchingRoles.length
        ? `Job title aligns with: ${matchingRoles.join(", ")}.`
        : "The job title does not clearly match the candidate's target roles."
    ));
  }

  // Location: only award a strong score for an explicit location match.
  const locationTerms = uniqueStrings([
    ...candidate.preferredLocations,
    ...(candidate.location ? [candidate.location] : []),
  ]);

  if (locationTerms.length > 0 && job.location) {
    const normalizedLocation = normalize(job.location);
    const matchingLocations = locationTerms.filter((location) => {
      const normalized = normalize(location);
      return normalizedLocation.includes(normalized) ||
        normalized.includes(normalizedLocation);
    });

    const isRemote = normalize(`${job.remoteType ?? ""} ${job.description}`)
      .includes("remote");

    dimensions.push(scoreDimension(
      "location",
      matchingLocations.length ? 100 : isRemote ? 70 : 0,
      15,
      matchingLocations.length
        ? `Job location matches: ${matchingLocations.join(", ")}.`
        : isRemote
          ? "The listing mentions remote work, but country eligibility still needs confirmation."
          : `No clear location match found for ${job.location}.`
    ));
  }

  // Employment type: match only when the listing provides this information.
  const employmentTypes = uniqueStrings(candidate.employmentTypes);
  if (employmentTypes.length > 0 && job.employmentType) {
    const normalizedType = normalize(job.employmentType);
    const matchingTypes = employmentTypes.filter((type) => {
      const normalized = normalize(type);
      return normalizedType.includes(normalized) ||
        normalized.includes(normalizedType);
    });

    dimensions.push(scoreDimension(
      "employmentType",
      matchingTypes.length ? 100 : 0,
      10,
      matchingTypes.length
        ? `Employment type matches: ${matchingTypes.join(", ")}.`
        : `The listed employment type (${job.employmentType}) does not clearly match the candidate's preferences.`
    ));
  }

  // Normalize weights across dimensions with enough data to evaluate.
  const totalWeight = dimensions.reduce((sum, item) => sum + item.weight, 0);
  const score = totalWeight === 0
    ? 0
    : Math.round(
        dimensions.reduce(
          (sum, item) => sum + item.score * item.weight,
          0,
        ) / totalWeight,
      );

  const reasoning = totalWeight === 0
    ? "Not enough profile information is available to calculate a meaningful match. Add target roles, skills, location preferences, or employment preferences."
    : dimensions.map((item) => item.explanation).join(" ");

  return { score, reasoning, dimensions };
}

export async function refreshCandidateMatches(userId: string) {
  const [profile, resumes, jobs] = await Promise.all([
    prisma.candidateProfile.findUnique({ where: { userId } }),
    prisma.resume.findMany({
      where: {
        userId,
        isPrimary: true,
        processingStatus: "COMPLETED",
      },
      select: { structuredData: true },
      take: 1,
    }),
    prisma.job.findMany({
      where: { status: "ACTIVE" },
      include: {
        company: { select: { name: true } },
      },
      orderBy: { discoveredAt: "desc" },
      take: 500,
    }),
  ]);

  if (!profile) {
    throw new Error("Complete your candidate profile before refreshing job matches.");
  }

  const resumeData = resumes[0]?.structuredData;
  const resumeSkills = getResumeSkills(resumeData);
  const resumeRoles = getResumeRoles(resumeData);

  const candidate: CandidateData = {
    targetRoles: uniqueStrings([...profile.targetRoles, ...resumeRoles]),
    preferredLocations: profile.preferredLocations,
    skills: uniqueStrings([...profile.skills, ...resumeSkills]),
    industries: profile.industries,
    employmentTypes: profile.employmentTypes,
    location: profile.location,
    remotePreference: profile.remotePreference,
    yearsExperience: profile.yearsExperience,
  };

  let updated = 0;

  for (const job of jobs) {
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
        userId_jobId: { userId, jobId: job.id },
      },
      create: {
        userId,
        jobId: job.id,
        score: match.score,
        reasoning: JSON.stringify({
          summary: match.reasoning,
          dimensions: match.dimensions,
          version: 1,
        }),
      },
      update: {
        score: match.score,
        reasoning: JSON.stringify({
          summary: match.reasoning,
          dimensions: match.dimensions,
          version: 1,
        }),
      },
    });

    updated++;
  }

  return {
    jobsConsidered: jobs.length,
    matchesUpdated: updated,
    resumeUsed: Boolean(resumeData),
  };
}
