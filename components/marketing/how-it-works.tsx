"use client";

import { motion } from "framer-motion";
import { Camera, Wand2, MessagesSquare, Hammer } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

const STEPS = [
  {
    icon: Camera,
    title: "Snap or upload a photo",
    description: "Take a picture of any room, or upload one you already have. No fancy camera needed.",
  },
  {
    icon: Wand2,
    title: "Pick a style, generate instantly",
    description: "Choose from curated design styles and room types — our AI generates concepts in seconds.",
  },
  {
    icon: MessagesSquare,
    title: "Talk to a real designer",
    description: "Continue the conversation on WhatsApp with an expert who already knows your taste and budget.",
  },
  {
    icon: Hammer,
    title: "Bring it to life",
    description: "Get a shoppable plan, sourcing help, and hands-on project support to make it real.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <Container className="flex flex-col items-center gap-14">
        <SectionHeading
          eyebrow="How It Works"
          title="From a phone photo to a finished room"
          description="Four simple steps take you from inspiration to installation — powered by AI, backed by real designers."
        />

        <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative flex flex-col gap-4 rounded-3xl border border-brand-border bg-brand-ivory/60 p-7"
            >
              <span className="absolute right-6 top-6 font-display text-3xl text-brand-gold/30">
                0{index + 1}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-ink text-brand-gold">
                <step.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-xl text-brand-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-brand-ink-soft/75">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
