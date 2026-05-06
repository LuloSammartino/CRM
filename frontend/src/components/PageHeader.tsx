type Tone = "violet" | "sky" | "emerald" | "amber" | "rose";

const toneClass: Record<Tone, string> = {
  violet: "from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400",
  sky: "from-sky-600 to-cyan-600 dark:from-sky-400 dark:to-cyan-400",
  emerald: "from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400",
  amber: "from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400",
  rose: "from-rose-600 to-pink-600 dark:from-rose-400 dark:to-pink-400"
};

type Props = {
  title: string;
  subtitle?: string;
  tone?: Tone;
};

export default function PageHeader({ title, subtitle, tone = "violet" }: Props) {
  return (
    <div className="space-y-1">
      <h1
        className={`text-xl font-bold tracking-tight bg-gradient-to-r bg-clip-text text-transparent ${toneClass[tone]}`}
      >
        {title}
      </h1>
      {subtitle ? <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
    </div>
  );
}
