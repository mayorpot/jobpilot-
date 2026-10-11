
import { prisma } from "@jobpilot/db";

const TRUSTED_HOSTS: Record<string, string[]> = {
  GREENHOUSE: [
    "boards.greenhouse.io",
    "job-boards.greenhouse.io",
  ],
  LEVER: [
    "jobs.lever.co",
  ],
};

type EvidenceItem = {
  check: string;
  passed: boolean;
  detail: string;
};

function isAllowedHost(urlValue: string, allowedHosts: string[]): boolean {
  try {
    const url = new URL(urlValue);
    return (
      url.protocol === "https:" &&
      allowedHosts.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    );
  } catch {
    return false;
  }
}

async function checkListingUrl(urlValue: string): Promise<{
  reachable: boolean;
  statusCode: number | null;
  detail: string;
}> {
  try {
    const url = new URL(urlValue);

    if (url.protocol !== "https:") {
      return {
        reachable: false,
        statusCode: null,
        detail: "Listing URL does not use HTTPS",
      };
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "JobPilot/0.1 job-listing-verifier",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });

    // Do not follow redirects automatically. A redirect may lead away
    // from the expected job board and must be evaluated separately.
    const statusCode = response.status;
    await response.body?.cancel();

    return {
      reachable: statusCode >= 200 && statusCode < 300,
      statusCode,
      detail: `Listing returned HTTP ${statusCode}`,
    };
  } catch (error) {
    return {
      reachable: false,
      statusCode: null,
      detail: error instanceof Error ? error.message : "Request failed",
    };
  }
}

export async function verifyJob(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { source: true },
  });

  if (!job) {
    throw new Error(`Job ${jobId} was not found`);
  }

  const evidence: EvidenceItem[] = [];
  const riskFlags: string[] = [];
  const allowedHosts = TRUSTED_HOSTS[job.source.type] ?? [];

  const sourceSupported = job.source.isActive && allowedHosts.length > 0;
  evidence.push({
    check: "configured_source",
    passed: sourceSupported,
    detail: sourceSupported
      ? `Source ${job.source.name} is active and its provider is supported`
      : `Source ${job.source.name} is inactive or unsupported`,
  });

  const urlMatchesSource = isAllowedHost(job.canonicalUrl, allowedHosts);
  evidence.push({
    check: "canonical_url_domain",
    passed: urlMatchesSource,
    detail: urlMatchesSource
      ? "Canonical URL uses an allowed provider domain"
      : "Canonical URL does not match the configured provider domains",
  });

  if (!sourceSupported) riskFlags.push("UNSUPPORTED_OR_INACTIVE_SOURCE");
  if (!urlMatchesSource) riskFlags.push("CANONICAL_URL_DOMAIN_MISMATCH");

  let reachable = false;
  let statusCode: number | null = null;
  let reachabilityDetail = "URL was not checked because its domain did not match the source";

  if (urlMatchesSource) {
    const result = await checkListingUrl(job.canonicalUrl);
    reachable = result.reachable;
    statusCode = result.statusCode;
    reachabilityDetail = result.detail;

    if (!reachable) riskFlags.push("LISTING_NOT_CONFIRMED_REACHABLE");
  }

  evidence.push({
    check: "listing_reachability",
    passed: reachable,
    detail: reachabilityDetail,
  });

  // "Verified" here means the configured source and domain agree,
  // and the listing URL responded successfully at verification time.
  // It is not a guarantee that the employer or job is legitimate.
  const isVerified = sourceSupported && urlMatchesSource && reachable;
  const confidence = isVerified
    ? 85
    : sourceSupported && urlMatchesSource
      ? 45
      : 10;

  const result = await prisma.verificationResult.create({
    data: {
      jobId: job.id,
      confidence,
      isVerified,
      evidence: {
        checkedAt: new Date().toISOString(),
        provider: job.source.type,
        sourceName: job.source.name,
        canonicalUrl: job.canonicalUrl,
        httpStatus: statusCode,
        checks: evidence,
      },
      riskFlags,
    },
  });

  await prisma.job.update({
    where: { id: job.id },
    data: { lastVerifiedAt: new Date() },
  });

  return result;
}

export async function verifyActiveJobs(limit = 100) {
  const jobs = await prisma.job.findMany({
    where: { status: "ACTIVE" },
    orderBy: { lastVerifiedAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const results = [];

  for (const job of jobs) {
    try {
      results.push(await verifyJob(job.id));
    } catch (error) {
      console.error(`[verification] Job ${job.id} failed:`, error);
    }
  }

  console.log(`[verification] Checked ${results.length} of ${jobs.length} selected jobs`);
  return { selected: jobs.length, checked: results.length };
}
