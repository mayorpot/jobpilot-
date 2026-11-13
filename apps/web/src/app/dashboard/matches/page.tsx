"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Wifi,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type Job = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  employmentType?: string | null;
  remoteType?: string | null;
  applicationUrl?: string | null;
  canonicalUrl?: string | null;
  postedAt?: string | null;
  discoveredAt?: string | null;
  lastVerifiedAt?: string | null;
  company?: {
    name?: string;
    website?: string | null;
  };
  source?: {
    name?: string;
  };
  latestVerification?: {
    isVerified?: boolean;
    confidence?: number;
  } | null;
  verification?: {
    isVerified?: boolean;
    confidence?: number;
  } | null;
};

type MatchDimension = {
  name: string;
  score: number;
  weight: number;
  explanation: string;
};

type MatchDetails = {
  summary: string;
  dimensions: MatchDimension[];
  version?: number;
};

type JobMatch = {
  id: string;
  score: number;
  reasoning?: string | null;
  job: Job;
};

type MatchesResponse = {
  data: JobMatch[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RefreshResponse = {
  jobsConsidered: number;
  matchesUpdated: number;
  resumeUsed?: boolean;
  message?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function cleanDescription(value?: string | null) {
  if (!value) return "No job description available.";

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getMatchCategory(score: number) {
  const value = getScore(score);

  if (value >= 85) {
    return {
      label: "Excellent match",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  if (value >= 70) {
    return {
      label: "Strong match",
      className: "bg-blue-50 text-blue-700",
    };
  }

  if (value >= 50) {
    return {
      label: "Moderate match",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Low match",
    className: "bg-slate-100 text-slate-600",
  };
}

function parseMatchDetails(
  reasoning?: string | null,
): MatchDetails | null {
  if (!reasoning) return null;

  try {
    const parsed: unknown = JSON.parse(reasoning);

    if (!parsed || typeof parsed !== "object") return null;

    const data = parsed as Record<string, unknown>;

    return {
      summary:
        typeof data.summary === "string" ? data.summary : "",

      dimensions: Array.isArray(data.dimensions)
        ? data.dimensions.filter(
            (item): item is MatchDimension =>
              Boolean(item) &&
              typeof item === "object" &&
              typeof (item as MatchDimension).name === "string" &&
              typeof (item as MatchDimension).score === "number" &&
              typeof (item as MatchDimension).explanation === "string",
          )
        : [],

      version:
        typeof data.version === "number" ? data.version : undefined,
    };
  } catch {
    // Older matches may contain ordinary text rather than JSON.
    return null;
  }
}

function MatchScore({ score }: { score: number }) {
  const value = getScore(score);

  return (
    <div className="min-w-24">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-950">
          {value}%
        </span>
        <span className="text-xs text-slate-500">match</span>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Job match score"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function MatchBreakdown({
  dimensions,
}: {
  dimensions: MatchDimension[];
}) {
  if (dimensions.length === 0) return null;

  const labels: Record<string, string> = {
    skills: "Skills",
    role: "Target role",
    location: "Location",
    employmentType: "Employment type",
    industry: "Industry",
    experience: "Experience",
    remotePreference: "Work arrangement",
  };

  return (
    <div className="mt-5 rounded-xl border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-900">
        Match breakdown
      </h4>

      <p className="mt-1 text-xs text-slate-500">
        How your profile compares with this vacancy.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {dimensions.map((dimension) => {
          const score = getScore(dimension.score);

          return (
            <div key={dimension.name}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {labels[dimension.name] ?? dimension.name}
                </span>

                <span className="text-sm font-semibold text-slate-900">
                  {score}%
                </span>
              </div>

              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label={`${labels[dimension.name] ?? dimension.name} match`}
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${score}%` }}
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {dimension.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerificationLabel({ job }: { job: Job }) {
  const verification = job.latestVerification ?? job.verification;

  if (verification?.isVerified === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <ShieldCheck size={13} />
        Verified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      <ShieldCheck size={13} />
      Not verified
    </span>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  const loadMatches = useCallback(async (requestedPage = page) => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<MatchesResponse>(
        `/matches?page=${requestedPage}&limit=25`
      );

      setMatches(response.data ?? []);
      setPagination(
        response.pagination ?? {
          page: requestedPage,
          limit: 25,
          total: response.data?.length ?? 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve your job matches."
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadMatches(page);
  }, [page, loadMatches]);

  async function refreshMatches() {
    setRefreshing(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest<RefreshResponse>(
        "/matches/refresh",
        { method: "POST" }
      );

      setNotice(
        `Matching completed. ${result.matchesUpdated} matches updated from ${result.jobsConsidered} jobs considered.`
      );

      setPage(1);
      await loadMatches(1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't refresh your matches."
      );
    } finally {
      setRefreshing(false);
    }
  }

  const averageScore =
    matches.length > 0
      ? Math.round(
          matches.reduce((sum, match) => sum + getScore(match.score), 0) /
            matches.length
        )
      : 0;

  const verifiedCount = matches.filter(
    (match) =>
      (match.job.latestVerification ?? match.job.verification)?.isVerified ===
      true
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Personalised opportunities
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Your job matches
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Discover opportunities ranked according to how well they align
            with your candidate profile and available resume information.
          </p>
        </div>

        <button
          onClick={refreshMatches}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing matches..." : "Refresh my matches"}
        </button>
      </div>

      {/* Information */}
      <div className="mt-7 flex gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
          <Sparkles size={20} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            How matching works
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            JobPilot evaluates skills, target roles, location preferences and
            employment type. Match scores indicate profile alignment; they
            do not guarantee an interview or employment.
          </p>
        </div>
      </div>

      {/* Feedback */}
      {notice && (
        <div className="mt-5 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0" />
          {notice}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            Unable to load job matches
          </p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button
            onClick={() => void loadMatches(page)}
            className="mt-3 text-sm font-semibold text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Target size={19} />}
          label="Matches on this page"
          value={loading ? "—" : String(matches.length)}
          description="Personalised opportunities"
        />

        <SummaryCard
          icon={<Sparkles size={19} />}
          label="Average match score"
          value={loading ? "—" : `${averageScore}%`}
          description="Across the current page"
        />

        <SummaryCard
          icon={<ShieldCheck size={19} />}
          label="Verified matches"
          value={loading ? "—" : String(verifiedCount)}
          description="Positive verification results"
        />
      </div>

      {/* Results heading */}
      <div className="mt-9 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Recommended for you
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? "Loading your matches..."
              : `${pagination.total.toLocaleString()} total matches`}
          </p>
        </div>

        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Browse all jobs <ArrowRight size={15} />
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-5 grid gap-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="mt-4 h-6 w-2/3 rounded bg-slate-200" />
              <div className="mt-4 h-4 w-1/3 rounded bg-slate-100" />
              <div className="mt-6 h-2 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {/* Match cards */}
      {!loading && !error && matches.length > 0 && (
        <div className="mt-5 grid gap-4">
          {matches.map((match) => {
            const job = match.job;
            const applicationUrl = job.applicationUrl || job.canonicalUrl;
            const details = parseMatchDetails(match.reasoning);
            const category = getMatchCategory(match.score);

            return (
              <article
                key={match.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6"
              >
                <div className="flex flex-col justify-between gap-5 sm:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-blue-600">
                        {job.company?.name || "Employer"}
                      </span>
                      <VerificationLabel job={job} />
                    </div>

                    <h3 className="mt-2 text-lg font-semibold text-slate-950">
                      {job.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                      {job.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} />
                          {job.location}
                        </span>
                      )}

                      {job.employmentType && (
                        <span className="inline-flex items-center gap-1">
                          <BriefcaseBusiness size={13} />
                          {job.employmentType}
                        </span>
                      )}

                      {job.remoteType && (
                        <span className="inline-flex items-center gap-1">
                          <Wifi size={13} />
                          {job.remoteType}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="sm:w-40">
                    <MatchScore score={match.score} />

                    <span
                      className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${category.className}`}
                    >
                      {category.label}
                    </span>
                  </div>
                </div>

                {(details?.summary || match.reasoning) && (
                  <div className="mt-5 rounded-lg bg-blue-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Why this job matches
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {details?.summary || match.reasoning}
                    </p>
                  </div>
                )}

                {details?.dimensions && details.dimensions.length > 0 && (
                  <MatchBreakdown dimensions={details.dimensions} />
                )}

                <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                  {cleanDescription(job.description)}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <span className="text-xs text-slate-400">
                    Posted {formatDate(job.postedAt || job.discoveredAt)}
                  </span>

                  {applicationUrl ? (
                    <a
                      href={applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Apply now <ExternalLink size={14} />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Application link unavailable
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && matches.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Target size={22} />
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No personalised matches yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Make sure your candidate profile includes your target roles and
            skills. Then refresh your matches to calculate opportunities
            against the available jobs.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard/profile"
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Review my profile
            </Link>

            <button
              onClick={refreshMatches}
              disabled={refreshing}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Generate matches"}
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination.totalPages > 1 && (
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <button
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.totalPages, current + 1)
                )
              }
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3 text-slate-500">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
          {icon}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>

      <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}