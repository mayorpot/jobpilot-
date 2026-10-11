import { FileText } from "lucide-react";

export default function ApplicationsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <p className="text-sm font-medium text-blue-600">
          Application workspace
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Applications
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Applications prepared or submitted through JobPilot will be tracked here.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <FileText size={21} />
        </div>

        <h2 className="mt-4 font-medium text-slate-900">
          No applications yet
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Once a verified job is matched to you and an application is
          prepared, its status will appear here.
        </p>
      </div>
    </div>
  );
}