"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, FileText, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type Profile = {
  headline: string | null;
  targetRoles: string[];
  skills: string[];
};

type Resume = {
  id: string;
  fileName: string;
  isPrimary: boolean;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const userResult = await apiRequest<{ user: User }>(
          "/auth/me"
        );

        const profileResult = await apiRequest<{
          profile: Profile | null;
        }>("/candidate/profile");

        const resumeResult = await apiRequest<{
          resumes: Resume[];
        }>("/resumes");

        setUser(userResult.user);
        setProfile(profileResult.profile);
        setResumes(resumeResult.resumes);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      </div>
    );
  }

  const firstName = user?.firstName || "there";

  return (
    <div>
      <header className="border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="lg:hidden">
            <Link
              href="/dashboard"
              className="font-semibold text-slate-950"
            >
              JobPilot
            </Link>
          </div>

          <div className="ml-auto">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Overview
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Good to see you, {firstName}.
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Your JobPilot workspace keeps your career profile,
            opportunities and applications in one place.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <DashboardCard
            icon={<UserRound size={19} />}
            label="Profile"
            value={profile ? "Complete" : "Incomplete"}
            description={
              profile?.headline ||
              "Add your professional profile"
            }
            href="/dashboard/profile"
          />

          <DashboardCard
            icon={<FileText size={19} />}
            label="Resume"
            value={`${resumes.length}`}
            description={
              resumes.length === 1
                ? "Resume stored securely"
                : "Resumes stored securely"
            }
            href="/dashboard/profile"
          />

          <DashboardCard
            icon={<BriefcaseBusiness size={19} />}
            label="Verified matches"
            value="0"
            description="No verified opportunities yet"
            href="/dashboard/jobs"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Job matches
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Verified opportunities matched to your profile.
                </p>
              </div>

              <Link
                href="/dashboard/jobs"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View jobs
              </Link>
            </div>

            <div className="mt-8 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <BriefcaseBusiness size={20} />
              </div>

              <h3 className="mt-4 font-medium text-slate-900">
                No verified matches yet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Once JobPilot starts discovering and verifying
                opportunities, relevant matches will appear here.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-950">
              Your profile
            </h2>

            <div className="mt-5 space-y-5">
              <ProfileRow
                label="Target roles"
                value={
                  profile?.targetRoles?.length
                    ? profile.targetRoles.join(", ")
                    : "Not configured"
                }
              />

              <ProfileRow
                label="Skills"
                value={
                  profile?.skills?.length
                    ? profile.skills.slice(0, 5).join(", ")
                    : "Not configured"
                }
              />

              <Link
                href="/onboarding"
                className="block text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Update profile →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  icon,
  label,
  value,
  description,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"
    >
      <div className="flex items-center gap-3 text-slate-500">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
          {icon}
        </span>

        <span className="text-sm font-medium">{label}</span>
      </div>

      <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 truncate text-sm text-slate-500">
        {description}
      </p>
    </Link>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}