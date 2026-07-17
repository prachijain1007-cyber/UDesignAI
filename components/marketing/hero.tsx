"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/services/analytics-client";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-16 sm:pb-28 sm:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-brand-gold-light)_0%,transparent_70%)] opacity-20"
      />

      <Container className="flex flex-col items-center text-center">
        <motion.div
          initial="hidden"
          animate="show"
          custom={0}
          variants={fadeUp}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-gold-dark dark:text-brand-gold"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Interior Design, Human Craftsmanship
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="show"
          custom={0.1}
          variants={fadeUp}
          className="max-w-4xl font-display text-4xl leading-[1.08] text-brand-ink sm:text-6xl md:text-7xl"
        >
          Reimagine any room in
          <span className="italic text-brand-gold-dark dark:text-brand-gold"> seconds</span>,
          then bring it to life with a real designer.
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="show"
          custom={0.22}
          variants={fadeUp}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-ink-soft/80"
        >
          Upload a photo of your space, pick a style, and let UDesign AI generate stunning,
          on-budget concepts instantly. When you&rsquo;re ready, chat with an expert designer on
          WhatsApp — no forms, no waiting rooms, no losing context.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="show"
          custom={0.34}
          variants={fadeUp}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Button
            href="/studio"
            variant="gold"
            size="lg"
            onClick={() => trackEvent({ type: "CTA_CLICKED", metadata: { cta: "hero-generate" } })}
          >
            Generate My Room Design
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            href="/consultation"
            variant="outline"
            size="lg"
            onClick={() => trackEvent({ type: "CTA_CLICKED", metadata: { cta: "hero-consultation" } })}
          >
            Book a Free Consultation
          </Button>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          custom={0.46}
          variants={fadeUp}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-brand-ink-soft/70"
        >
          <div className="flex items-center gap-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-brand-gold text-brand-gold" />
              ))}
            </div>
            <span>4.9/5 from 2,400+ homeowners</span>
          </div>
          <span className="hidden h-4 w-px bg-brand-border sm:block" />
          <span>40,000+ AI designs generated</span>
          <span className="hidden h-4 w-px bg-brand-border sm:block" />
          <span>Designers in 20+ cities</span>
        </motion.div>
      </Container>
    </section>
  );
}
