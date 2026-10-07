"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const result = await apiRequest<{ user: User }>("/auth/me");
        setUser(result.user);

        const profileResult = await apiRequest<{ profile: Profile | null }>(
          "/candidate/profile"
        );
        setProfile(profileResult.profile);

        const resumeResult = await apiRequest<{ resumes: Resume[] }>("/resumes");
        setResumes(resumeResult.resumes);
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("Authentication") ||
            err.message.includes("session") ||
            err.message.includes("expired"))
        ) {
          router.replace("/login");
          return;
        }

        setError(err instanceof Error ? err.message : "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading your dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-bold text-slate-950">
            JobPilot<span className="text-blue-600">.</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-600 sm:block">
              {user?.email}
            </span>
            <button
              onClick={async () => {
                await apiRequest("/auth/logout", { method: "POST" });
                router.replace("/login");
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600">Your workspace</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Welcome{user?.firstName ? `, ${user.firstName}` : " back"}
            </h1>
            <p className="mt-2 text-slate-600">
              Your job search workspace is ready.
            </p>
          </div>

          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit career profile
          </Link>
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Career profile</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {profile ? "Created" : "Not completed"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {profile?.headline || "Add your professional headline"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">CVs uploaded</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumes.length}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {resumes.some((resume) => resume.isPrimary)
                ? "Primary CV selected"
                : "Upload your CV to get started"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Job matches</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">—</p>
            <p className="mt-2 text-sm text-slate-500">
              Job discovery is being connected.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Your next steps
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-medium text-slate-900">1. Complete your profile</p>
              <p className="mt-2 text-sm text-slate-600">
                Add your target roles, skills, and preferred locations.
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-medium text-slate-900">2. Upload your CV</p>
              <p className="mt-2 text-sm text-slate-600">
                Keep your current resume in your private JobPilot workspace.
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-medium text-slate-900">3. Prepare for job matching</p>
              <p className="mt-2 text-sm text-slate-600">
                JobPilot will use your profile to evaluate discovered roles.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}