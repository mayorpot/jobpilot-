import Link from "next/link";
import { LogoMark } from "./logo-mark";

export function Brand({
  href = "/",
}: {
  href?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoMark />

      <span className="text-[17px] font-semibold tracking-tight text-slate-950">
        JobPilot
      </span>
    </Link>
  );
}