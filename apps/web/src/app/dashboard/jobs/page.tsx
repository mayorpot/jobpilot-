import { BriefcaseBusiness, ShieldCheck } from "lucide-react";

export default function JobsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <p className="text-sm font-medium text-blue-600">
          Opportunities
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Jobs
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Opportunities discovered and verified by JobPilot will appear here.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <ShieldCheck size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-950">
              Verified opportunities
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              We won't show an opportunity here simply because an AI model
              thinks it looks legitimate.
            </p>
          </div>
        </div>

        <div className="px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <BriefcaseBusiness size={21} />
          </div>

          <h3 className="mt-4 font-medium text-slate-900">
            Job discovery is not connected yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            The next backend stage will connect JobPilot to real job
            sources, normalize listings, remove duplicates and verify
            opportunities before they reach this screen.
          </p>
        </div>
      </div>
    </div>
  );
}