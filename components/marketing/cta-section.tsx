"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/services/analytics-client";

export function CTASection() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-brand-ink px-8 py-16 text-center sm:px-16 sm:py-20"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,var(--color-brand-gold)_0%,transparent_70%)] opacity-25"
          />
          <div className="relative flex flex-col items-center gap-6">
            <h2 className="max-w-2xl font-display text-3xl text-brand-cream sm:text-4xl md:text-5xl">
              Your dream room is one photo away.
            </h2>
            <p className="max-w-xl text-brand-cream/70">
              Upload a picture, choose a style, and see your space transformed — free, in seconds.
            </p>
            <Button
              href="/studio"
              variant="gold"
              size="lg"
              onClick={() => trackEvent({ type: "CTA_CLICKED", metadata: { cta: "footer-band" } })}
            >
              Generate My Room Design
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
