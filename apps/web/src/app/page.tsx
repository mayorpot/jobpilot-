import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import { Brand } from "@/components/brand";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Brand />

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-950 sm:block"
            >
              Sign in
            </Link>

            <Link
              href="/register"
              className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl px-6 pb-24 pt-24 text-center sm:pt-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
            <Sparkles size={15} />
            AI-powered career automation
          </div>

          <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Your next opportunity
            <span className="text-blue-600"> shouldn't require endless searching.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-500">
            JobPilot continuously discovers relevant opportunities,
            verifies them, matches them to your career profile and prepares
            your applications.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Create your profile
              <ArrowRight size={17} />
            </Link>

            <Link
              href="/login"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-6 md:grid-cols-3">
            <Feature
              icon={<ShieldCheck size={21} />}
              title="Verify before you apply"
              description="JobPilot is designed to evaluate the source, company and application path before treating an opportunity as trustworthy."
            />

            <Feature
              icon={<Sparkles size={21} />}
              title="Match beyond keywords"
              description="Your profile becomes the basis for evaluating how well a role fits your skills, experience and preferences."
            />

            <Feature
              icon={<CheckCircle2 size={21} />}
              title="Prepare better applications"
              description="Your CV, cover letter and application answers can be tailored to the specific opportunity."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          Built for continuous job search
        </p>

        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          You work. JobPilot keeps watching.
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500">
          The long-term goal is simple: turn job searching from a manual,
          repetitive process into an intelligent career workflow.
        </p>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 text-sm text-slate-500">
          <Brand />

          <span>
            © {new Date().getFullYear()} JobPilot
          </span>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <h3 className="mt-5 font-semibold text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}