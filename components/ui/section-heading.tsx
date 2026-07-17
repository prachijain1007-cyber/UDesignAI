import { cn } from "@/utils/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-4",
        align === "center" ? "mx-auto items-center text-center" : "items-start text-left",
        className
      )}
    >
      {eyebrow && (
        <span className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold-dark dark:text-brand-gold">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl leading-tight text-brand-ink sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="text-base leading-relaxed text-brand-ink-soft/80 sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
