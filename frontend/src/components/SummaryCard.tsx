import React from "react";

export type SummaryAccent = "sky" | "emerald" | "amber" | "violet";

const shell: Record<SummaryAccent, string> = {
  sky: [
    "border-sky-200/90",
    "bg-gradient-to-br from-sky-100 via-white to-cyan-50/90",
    "shadow-md shadow-sky-200/25",
    "dark:from-sky-950/40 dark:via-slate-900 dark:to-slate-900",
    "dark:border-sky-800/55 dark:shadow-none"
  ].join(" "),
  emerald: [
    "border-emerald-200/90",
    "bg-gradient-to-br from-emerald-100 via-white to-teal-50/90",
    "shadow-md shadow-emerald-200/25",
    "dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900",
    "dark:border-emerald-800/55 dark:shadow-none"
  ].join(" "),
  amber: [
    "border-amber-200/90",
    "bg-gradient-to-br from-amber-100 via-white to-orange-50/90",
    "shadow-md shadow-amber-200/25",
    "dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900",
    "dark:border-amber-800/55 dark:shadow-none"
  ].join(" "),
  violet: [
    "border-violet-200/90",
    "bg-gradient-to-br from-violet-100 via-white to-fuchsia-50/90",
    "shadow-md shadow-violet-200/25",
    "dark:from-violet-950/40 dark:via-slate-900 dark:to-slate-900",
    "dark:border-violet-800/55 dark:shadow-none"
  ].join(" ")
};

const labelCls: Record<SummaryAccent, string> = {
  sky: "text-sky-800/90 dark:text-sky-200/90",
  emerald: "text-emerald-800/90 dark:text-emerald-200/90",
  amber: "text-amber-900/90 dark:text-amber-200/90",
  violet: "text-violet-900/90 dark:text-violet-200/90"
};

const valueCls: Record<SummaryAccent, string> = {
  sky: "text-sky-950 dark:text-sky-50",
  emerald: "text-emerald-950 dark:text-emerald-50",
  amber: "text-amber-950 dark:text-amber-50",
  violet: "text-violet-950 dark:text-violet-50"
};

const hintCls: Record<SummaryAccent, string> = {
  sky: "text-sky-700/80 dark:text-sky-300/80",
  emerald: "text-emerald-700/80 dark:text-emerald-300/80",
  amber: "text-amber-800/80 dark:text-amber-300/80",
  violet: "text-violet-800/80 dark:text-violet-300/80"
};

type Props = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: SummaryAccent;
};

export default function SummaryCard({ label, value, hint, accent = "sky" }: Props) {
  return (
    <div className={`rounded-2xl border p-4 ring-1 ring-black/5 dark:ring-white/10 ${shell[accent]}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide ${labelCls[accent]}`}>{label}</div>
      <div className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${valueCls[accent]}`}>{value}</div>
      {hint ? <div className={`mt-1 text-xs font-medium ${hintCls[accent]}`}>{hint}</div> : null}
    </div>
  );
}
