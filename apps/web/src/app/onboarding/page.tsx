"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

type Profile = {
  headline: string | null;
  summary: string | null;
  location: string | null;
  yearsExperience: number | null;
  targetRoles: string[];
  preferredLocations: string[];
  skills: string[];
  industries: string[];
  employmentTypes: string[];
  remotePreference: string | null;
};

type Resume = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  version: number;
  isPrimary: boolean;
  createdAt: string;
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function OnboardingPage() {
  const router = useRouter();

  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [skills, setSkills] = useState("");
  const [industries, setIndustries] = useState("");
  const [employmentTypes, setEmploymentTypes] = useState("");
  const [remotePreference, setRemotePreference] = useState("ANY");

  const [resume, setResume] = useState<File | null>(null);
  const [savedResumes, setSavedResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadExistingData() {
      try {
        const result = await apiRequest<{ profile: Profile | null }>(
          "/candidate/profile"
        );

        if (result.profile) {
          const profile = result.profile;

          setHeadline(profile.headline ?? "");
          setSummary(profile.summary ?? "");
          setLocation(profile.location ?? "");
          setYearsExperience(
            profile.yearsExperience?.toString() ?? ""
          );
          setTargetRoles(profile.targetRoles.join(", "));
          setPreferredLocations(profile.preferredLocations.join(", "));
          setSkills(profile.skills.join(", "));
          setIndustries(profile.industries.join(", "));
          setEmploymentTypes(profile.employmentTypes.join(", "));
          setRemotePreference(profile.remotePreference ?? "ANY");
        }

        const resumeResult = await apiRequest<{ resumes: Resume[] }>(
          "/resumes"
        );

        setSavedResumes(resumeResult.resumes);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your profile"
        );
      }
    }

    void loadExistingData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const experience = yearsExperience.trim()
        ? Number(yearsExperience)
        : null;

      if (
        experience !== null &&
        (!Number.isInteger(experience) || experience < 0 || experience > 60)
      ) {
        throw new Error("Enter a valid number of years of experience.");
      }

      await apiRequest("/candidate/profile", {
        method: "PUT",
        body: JSON.stringify({
          headline,
          summary,
          location,
          yearsExperience: experience,
          targetRoles: splitList(targetRoles),
          preferredLocations: splitList(preferredLocations),
          skills: splitList(skills),
          industries: splitList(industries),
          employmentTypes: splitList(employmentTypes),
          remotePreference,
        }),
      });

      if (resume) {
        const formData = new FormData();
        formData.append("resume", resume);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/resumes`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Resume upload failed");
        }
      }

      setMessage("Your profile has been saved.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save your profile"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            JobPilot onboarding
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Build your career profile
          </h1>
          <p className="mt-2 text-slate-600">
            Tell us what you're looking for. You can update these details later.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Professional details
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Professional headline
                </label>
                <input
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder="e.g. Data Analyst | Python | SQL"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Professional summary
                </label>
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={4}
                  placeholder="Briefly describe your experience and career goals."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Current location
                  </label>
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="e.g. Lagos, Nigeria"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Years of experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={yearsExperience}
                    onChange={(event) => setYearsExperience(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Job preferences
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Separate multiple entries with commas.
            </p>

            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Target job titles
                </label>
                <input
                  value={targetRoles}
                  onChange={(event) => setTargetRoles(event.target.value)}
                  placeholder="e.g. Data Analyst, Backend Engineer"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Preferred locations
                </label>
                <input
                  value={preferredLocations}
                  onChange={(event) => setPreferredLocations(event.target.value)}
                  placeholder="e.g. Remote, Lagos, London"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Skills
                </label>
                <input
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                  placeholder="e.g. SQL, Python, TypeScript"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Industries
                </label>
                <input
                  value={industries}
                  onChange={(event) => setIndustries(event.target.value)}
                  placeholder="e.g. Technology, Finance, Agriculture"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Employment types
                </label>
                <input
                  value={employmentTypes}
                  onChange={(event) => setEmploymentTypes(event.target.value)}
                  placeholder="e.g. Full-time, Contract, Internship"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Remote preference
                </label>
                <select
                  value={remotePreference}
                  onChange={(event) => setRemotePreference(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                >
                  <option value="ANY">No preference</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ONSITE">On-site</option>
                </select>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Upload your CV
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              PDF or DOCX, maximum 5 MB.
            </p>

            <label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-blue-500">
              <span className="font-medium text-slate-800">
                {resume ? resume.name : "Choose a CV to upload"}
              </span>
              <span className="mt-1 text-sm text-slate-500">
                Select a file from your device
              </span>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={(event) => setResume(event.target.files?.[0] ?? null)}
              />
            </label>

            {savedResumes.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700">
                  Previously uploaded CVs
                </p>
                <ul className="mt-2 space-y-2">
                  {savedResumes.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"
                    >
                      <span className="truncate">{item.fileName}</span>
                      {item.isPrimary && (
                        <span className="ml-3 text-xs font-medium text-green-700">
                          Primary
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving your profile..." : "Save profile and continue"}
          </button>
        </form>
      </div>
    </main>
  );
}