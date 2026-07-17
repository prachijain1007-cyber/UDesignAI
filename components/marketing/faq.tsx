"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { FAQ_ITEMS } from "@/lib/site";
import { cn } from "@/utils/cn";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <Container className="flex flex-col items-center gap-14">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />

        <div className="w-full max-w-3xl divide-y divide-brand-border rounded-3xl border border-brand-border bg-brand-ivory/60">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.question} className="px-6 sm:px-8">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 py-6 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-lg text-brand-ink">{item.question}</span>
                  <Plus
                    className={cn(
                      "h-5 w-5 shrink-0 text-brand-gold-dark transition-transform duration-300",
                      isOpen && "rotate-45"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 text-sm leading-relaxed text-brand-ink-soft/75">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
