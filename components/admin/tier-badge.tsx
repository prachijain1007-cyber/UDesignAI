import { cn } from "@/utils/cn";
import type { LeadTier } from "@prisma/client";

const STYLES: Record<LeadTier, string> = {
  HOT: "bg-brand-terracotta/15 text-brand-terracotta border-brand-terracotta/30",
  WARM: "bg-brand-gold/15 text-brand-gold-dark border-brand-gold/30",
  COLD: "bg-brand-ink/10 text-brand-ink-soft border-brand-ink/15",
};

export function TierBadge({ tier }: { tier: LeadTier }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        STYLES[tier]
      )}
    >
      {tier}
    </span>
  );
}
