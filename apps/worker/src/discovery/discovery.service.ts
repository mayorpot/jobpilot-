import { prisma } from "@jobpilot/db";

type GreenhouseJob = {
  id: number;
  title: string;
  updated_at?: string;
  absolute_url: string;
  content?: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
  offices?: Array<{ name?: string; location?: string }>;
};

type GreenhouseResponse = { jobs: GreenhouseJob[] };

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number;
  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
    department?: string;
  };
  workplaceType?: string;
  descriptionPlain?: string;
  description?: string;
};

type JobSourceConfig = {
  provider: "GREENHOUSE" | "LEVER";
  identifier: string;
};

function cleanText(value: string | undefined): string {
  return (value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function displayName(value: string): string {
  const knownNames: Record<string, string> = {
    gitlab: "GitLab",
    anthropic: "Anthropic",
    weloglobal: "Welo Global",
  };

  const known = knownNames[value.toLowerCase()];

  if (known) {
    return known;
  }

  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeDate(value: string | number | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getJson<T>(url: string): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "JobPilot/0.1 job-discovery",
        },
        signal: AbortSignal.timeout(45_000),
      });

      if (!response.ok) {
        const error = new Error(
          `Job source returned HTTP ${response.status}: ${url}`
        );

        // Retry rate limits and temporary server errors only.
        if (response.status !== 429 && response.status < 500) {
          throw error;
        }

        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      const retryable =
        (error instanceof Error &&
          (error.name === "TimeoutError" ||
            error.name === "AbortError" ||
            /HTTP (429|5\d\d)/.test(error.message))) ||
        error instanceof TypeError;

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      const delay = attempt * 3000;

      console.warn(
        `[job-discovery] Request failed. Retrying ${attempt}/${maxAttempts - 1} in ${delay / 1000}s...`,
        error
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Job source request failed after all retry attempts.");
}

async function getOrCreateSource(
  config: JobSourceConfig,
  boardUrl: string,
) {
  const name = `${config.provider}:${config.identifier}`;

  const existing = await prisma.jobSource.findFirst({
    where: { name },
  });

  if (existing) {
    return prisma.jobSource.update({
      where: { id: existing.id },
      data: {
        type: config.provider,
        baseUrl: boardUrl,
        isActive: true,
      },
    });
  }

  return prisma.jobSource.create({
    data: {
      name,
      type: config.provider,
      baseUrl: boardUrl,
      isActive: true,
    },
  });
}

async function getOrCreateCompany(input: {
  name: string;
  website?: string;
  careersUrl: string;
}) {
  const normalizedName = normalizeName(input.name);
  const existing = await prisma.company.findUnique({
    where: { normalizedName },
  });

  if (existing) {
    return prisma.company.update({
      where: { id: existing.id },
      data: {
        website: existing.website ?? input.website,
        careersUrl: input.careersUrl,
      },
    });
  }

  return prisma.company.create({
    data: {
      name: input.name,
      normalizedName,
      website: input.website,
      careersUrl: input.careersUrl,
    },
  });
}

function getWebsite(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

async function closeMissingJobs(
  sourceId: string,
  fetchedExternalIds: string[],
): Promise<number> {
  // An empty feed is not sufficient evidence that every vacancy
  // has been removed. Preserve existing jobs in this situation.
  if (fetchedExternalIds.length === 0) {
    console.warn(
      `[discovery] Empty feed for source ${sourceId}. Skipping vacancy closure.`,
    );
    return 0;
  }

  const result = await prisma.job.updateMany({
    where: {
      sourceId,
      status: "ACTIVE",
      externalId: {
        notIn: fetchedExternalIds,
      },
    },
    data: {
      status: "CLOSED",
    },
  });

  return result.count;
}

async function importGreenhouse(boardToken: string) {
  const boardUrl = `https://boards.greenhouse.io/${encodeURIComponent(boardToken)}`;
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
  const data = await getJson<GreenhouseResponse>(apiUrl);

  if (!Array.isArray(data.jobs)) {
    throw new Error(`Unexpected Greenhouse response for ${boardToken}`);
  }

  const invalidJobs = data.jobs.filter(
    (job) =>
      job.id === undefined ||
      job.id === null ||
      !job.title?.trim() ||
      !job.absolute_url?.trim() ||
      !cleanText(job.content),
  );

  if (invalidJobs.length > 0) {
    throw new Error(
      `Greenhouse board ${boardToken} returned ${invalidJobs.length} invalid job records. Skipping reconciliation.`,
    );
  }

  const source = await getOrCreateSource(
    { provider: "GREENHOUSE", identifier: boardToken },
    boardUrl,
  );

  const boardName = displayName(boardToken);
  const company = await getOrCreateCompany({
    name: boardName,
    website: undefined,
    careersUrl: boardUrl,
  });

  let imported = 0;

  for (const job of data.jobs) {
    const description = cleanText(job.content);
    const canonicalUrl = job.absolute_url?.trim();

    if (
      job.id === undefined ||
      job.id === null ||
      !job.title?.trim() ||
      !canonicalUrl ||
      !description
    ) {
      continue;
    }

    await prisma.job.upsert({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId: String(job.id),
        },
      },
      create: {
        companyId: company.id,
        sourceId: source.id,
        externalId: String(job.id),
        title: job.title.trim(),
        description,
        location: job.location?.name ?? null,
        employmentType: null,
        remoteType: null,
        canonicalUrl,
        applicationUrl: canonicalUrl,
        postedAt: safeDate(job.updated_at),
        status: "ACTIVE",
      },
      update: {
        title: job.title.trim(),
        description,
        location: job.location?.name ?? null,
        canonicalUrl,
        applicationUrl: canonicalUrl,
        postedAt: safeDate(job.updated_at),
        status: "ACTIVE",
      },
    });

    imported++;
  }

  const closed = await closeMissingJobs(
    source.id,
    data.jobs.map((job) => String(job.id)),
  );

  console.log(
    `[discovery] Greenhouse ${boardToken}: closed ${closed} missing vacancies.`,
  );

  return {
    provider: "GREENHOUSE",
    boardToken,
    fetched: data.jobs.length,
    imported,
    closed,
  };
}

async function importLever(site: string) {
  const boardUrl = `https://jobs.lever.co/${encodeURIComponent(site)}`;
  const apiUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`;
  const jobs = await getJson<LeverJob[]>(apiUrl);

  if (!Array.isArray(jobs)) {
    throw new Error(`Unexpected Lever response for ${site}`);
  }

  const isValidJob = (job: LeverJob) =>
    Boolean(
      job.id?.trim() &&
        job.text?.trim() &&
        job.hostedUrl?.trim() &&
        cleanText(job.descriptionPlain || job.description),
    );

  const invalidJobs = jobs.filter((job) => !isValidJob(job));
  const validJobs = jobs.filter(isValidJob);

  if (invalidJobs.length > 0) {
    console.warn(
      `[discovery] Lever ${site}: skipping ${invalidJobs.length} malformed records. Vacancy reconciliation will be skipped.`,
    );
  }

  const source = await getOrCreateSource(
    { provider: "LEVER", identifier: site },
    boardUrl,
  );

  const company = await getOrCreateCompany({
    name: displayName(site),
    careersUrl: boardUrl,
  });

  let imported = 0;

  for (const job of validJobs) {
    const description = cleanText(job.descriptionPlain || job.description);
    const canonicalUrl = job.hostedUrl?.trim();

    if (!job.id || !job.text?.trim() || !canonicalUrl || !description) {
      continue;
    }

    await prisma.job.upsert({
      where: {
        sourceId_externalId: {
          sourceId: source.id,
          externalId: job.id,
        },
      },
      create: {
        companyId: company.id,
        sourceId: source.id,
        externalId: job.id,
        title: job.text.trim(),
        description,
        location: job.categories?.location ?? null,
        employmentType: job.categories?.commitment ?? null,
        remoteType: job.workplaceType ?? null,
        canonicalUrl,
        applicationUrl: job.applyUrl ?? canonicalUrl,
        postedAt: safeDate(job.createdAt),
        status: "ACTIVE",
      },
      update: {
        title: job.text.trim(),
        description,
        location: job.categories?.location ?? null,
        employmentType: job.categories?.commitment ?? null,
        remoteType: job.workplaceType ?? null,
        canonicalUrl,
        applicationUrl: job.applyUrl ?? canonicalUrl,
        postedAt: safeDate(job.createdAt),
        status: "ACTIVE",
      },
    });

    imported++;
  }

  let closed = 0;

  if (invalidJobs.length === 0) {
    closed = await closeMissingJobs(
      source.id,
      validJobs.map((job) => job.id),
    );

    console.log(
      `[discovery] Lever ${site}: closed ${closed} missing vacancies.`,
    );
  } else {
    console.warn(
      `[discovery] Lever ${site}: reconciliation skipped because the feed contains malformed records.`,
    );
  }

  return {
    provider: "LEVER",
    site,
    fetched: jobs.length,
    imported,
    skipped: invalidJobs.length,
    closed,
  };
}

export async function runJobDiscovery() {
  const greenhouseBoards = (process.env.JOBPILOT_GREENHOUSE_BOARDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const leverSites = (process.env.JOBPILOT_LEVER_SITES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (greenhouseBoards.length === 0 && leverSites.length === 0) {
    console.warn(
      "[job-discovery] No employer boards configured. Set JOBPILOT_GREENHOUSE_BOARDS or JOBPILOT_LEVER_SITES.",
    );
    return [];
  }

  const results: Array<Record<string, string | number>> = [];
  const failures: string[] = [];

  for (const board of greenhouseBoards) {
    try {
      const result = await importGreenhouse(board);
      results.push(result);
      console.log("[job-discovery] Imported Greenhouse board:", result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      failures.push(`Greenhouse board ${board}: ${message}`);

      console.error(
        `[job-discovery] Greenhouse board ${board} failed:`,
        error
      );
    }
  }

  for (const site of leverSites) {
    try {
      const result = await importLever(site);
      results.push(result);
      console.log("[job-discovery] Lever site:", result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      failures.push(`Lever site ${site}: ${message}`);

      console.error(
        `[job-discovery] Lever site ${site} failed:`,
        error
      );
    }
  }

  const totalFetched = results.reduce(
    (sum, result) => sum + Number(result.fetched ?? 0),
    0,
  );

  const totalImported = results.reduce(
    (sum, result) => sum + Number(result.imported ?? 0),
    0,
  );

  const totalSkipped = results.reduce(
    (sum, result) => sum + Number(result.skipped ?? 0),
    0,
  );

  const totalClosed = results.reduce(
    (sum, result) => sum + Number(result.closed ?? 0),
    0,
  );

  console.log({
    boardsProcessed: results.length,
    totalFetched,
    totalImported,
    totalSkipped,
    totalClosed,
  });

  if (failures.length > 0) {
    throw new Error(
      `Discovery completed with ${failures.length} failed employer source(s):\n${failures.join("\n")}`
    );
  }

  return results;
}