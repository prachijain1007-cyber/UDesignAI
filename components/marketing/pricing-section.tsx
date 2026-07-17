"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "@/lib/site";
import { cn } from "@/utils/cn";
import { trackEvent } from "@/services/analytics-client";

export function PricingSection({ compact = false }: { compact?: boolean }) {
  return (
    <section id="pricing" className={compact ? "py-0" : "py-20 sm:py-28"}>
      <Container className="flex flex-col items-center gap-14">
        {!compact && (
          <SectionHeading
            eyebrow="Pricing"
            title="Simple pricing, real designers"
            description="Start free with AI concepts, then bring in a human designer only when you're ready."
          />
        )}

        <div className="grid w-full gap-6 lg:grid-cols-3">
          {PRICING_PLANS.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={cn(
                "flex flex-col gap-6 rounded-3xl border p-8",
                plan.highlighted
                  ? "border-brand-gold bg-brand-ink text-brand-cream shadow-2xl shadow-brand-gold/20 lg:-translate-y-3"
                  : "border-brand-border bg-brand-ivory/60 text-brand-ink"
              )}
            >
              {plan.highlighted && (
                <span className="w-fit rounded-full bg-brand-gold px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-ink">
                  Most Popular
                </span>
              )}
              <div>
                <h3 className="font-display text-2xl">{plan.name}</h3>
                <p
                  className={cn(
                    "mt-2 text-sm leading-relaxed",
                    plan.highlighted ? "text-brand-cream/70" : "text-brand-ink-soft/70"
                  )}
                >
                  {plan.description}
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl">{plan.price}</span>
                {plan.period && (
                  <span className={plan.highlighted ? "text-brand-cream/60" : "text-brand-ink-soft/60"}>
                    {plan.period}
                  </span>
                )}
              </div>

              <ul className="flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        plan.highlighted ? "text-brand-gold" : "text-brand-gold-dark"
                      )}
                    />
                    <span className={plan.highlighted ? "text-brand-cream/85" : "text-brand-ink-soft/85"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                href={plan.href}
                variant={plan.highlighted ? "gold" : "outline"}
                size="md"
                className={cn(
                  "w-full",
                  !plan.highlighted && "border-brand-ink/20 text-brand-ink"
                )}
                onClick={() =>
                  trackEvent({ type: "CTA_CLICKED", metadata: { cta: "pricing-plan", plan: plan.name } })
                }
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
