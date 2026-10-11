import type { ReactNode } from "react";
import { Brand } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between bg-slate-950 p-12 text-white">
          <div className="absolute inset-0">
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          <div className="relative">
            <Brand href="/" />
          </div>

          <div className="relative max-w-lg pb-16">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
              Your career operating system
            </p>

            <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-tight">
              Stop searching for jobs.
              <br />
              Let JobPilot search for you.
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
              Build your career profile once. JobPilot continuously discovers,
              verifies, matches and prepares relevant opportunities.
            </p>

            <div className="mt-10 flex items-center gap-6 text-sm text-slate-400">
              <span>Verified opportunities</span>
              <span>•</span>
              <span>AI-powered matching</span>
            </div>
          </div>

          <div className="relative text-xs text-slate-500">
            © {new Date().getFullYear()} JobPilot
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Brand href="/" />
            </div>

            {children}
          </div>
        </section>
      </div>
    </div>
  );
}