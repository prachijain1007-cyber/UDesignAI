import { cn } from "@/utils/cn";

const ACCENTS = {
  default: "text-brand-ink",
  gold: "text-brand-gold-dark",
  terracotta: "text-brand-terracotta",
  sage: "text-brand-sage",
} as const;

export function StatTile({
  label,
  value,
  accent = "default",
  suffix,
}: {
  label: string;
  value: number | string;
  accent?: keyof typeof ACCENTS;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-ink-soft/50">{label}</p>
      <p className={cn("mt-2 font-display text-3xl", ACCENTS[accent])}>
        {value}
        {suffix && <span className="ml-1 text-base text-brand-ink-soft/50">{suffix}</span>}
      </p>
    </div>
  );
}
