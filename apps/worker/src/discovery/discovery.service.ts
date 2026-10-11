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
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "JobPilot/0.1 job-discovery",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Job source returned HTTP ${response.status}: ${url}`);
  }

  return response.json() as Promise<T>;
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

async function importGreenhouse(boardToken: string) {
  const boardUrl = `https://boards.greenhouse.io/${encodeURIComponent(boardToken)}`;
  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
  const data = await getJson<GreenhouseResponse>(apiUrl);

  if (!Array.isArray(data.jobs)) {
    throw new Error(`Unexpected Greenhouse response for ${boardToken}`);
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

    if (!job.id || !job.title?.trim() || !canonicalUrl || !description) {
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

  return {
    provider: "GREENHOUSE",
    boardToken,
    fetched: data.jobs.length,
    imported,
  };
}

async function importLever(site: string) {
  const boardUrl = `https://jobs.lever.co/${encodeURIComponent(site)}`;
  const apiUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`;
  const jobs = await getJson<LeverJob[]>(apiUrl);

  if (!Array.isArray(jobs)) {
    throw new Error(`Unexpected Lever response for ${site}`);
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

  for (const job of jobs) {
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

  return {
    provider: "LEVER",
    site,
    fetched: jobs.length,
    imported,
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

  for (const board of greenhouseBoards) {
    try {
      const result = await importGreenhouse(board);
      results.push(result);
      console.log("[job-discovery] Imported Greenhouse board:", result);
    } catch (error) {
      console.error(
        `[job-discovery] Greenhouse board ${board} failed:`,
        error,
      );
    }
  }

  for (const site of leverSites) {
    try {
      const result = await importLever(site);
      results.push(result);
      console.log("[job-discovery] Lever site:", result);
    } catch (error) {
      console.error(`[job-discovery] Lever site ${site} failed:`, error);
    }
  }

  return results;
}