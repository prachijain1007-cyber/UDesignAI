"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { DESIGN_STYLES } from "@/lib/site";
import { trackEvent } from "@/services/analytics-client";

const GRADIENTS = [
  "from-[#e7d3ab] via-[#c9a15d] to-[#8f6435]",
  "from-[#d9e2d6] via-[#a9b8a2] to-[#6b7d63]",
  "from-[#302a24] via-[#5a4d3f] to-[#b8874f]",
  "from-[#e3b79a] via-[#c1633b] to-[#7c3a22]",
  "from-[#efe6d8] via-[#c9a15d] to-[#1c1815]",
  "from-[#cfe0e8] via-[#8fb0bd] to-[#4c6b78]",
];

export function StyleGallery() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="flex flex-col items-center gap-14">
        <SectionHeading
          eyebrow="Design Styles"
          title="A style for every taste, in every room"
          description="Explore curated aesthetics crafted by professional interior designers and fine-tuned by AI."
        />

        <div className="grid w-full grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {DESIGN_STYLES.map((style, index) => (
            <motion.div
              key={style.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: (index % 3) * 0.1 }}
            >
              <Link
                href={`/studio?style=${encodeURIComponent(style.name)}`}
                onClick={() =>
                  trackEvent({ type: "CTA_CLICKED", metadata: { cta: "style-gallery", style: style.name } })
                }
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl p-5 sm:p-6"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} transition-transform duration-500 group-hover:scale-105`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg text-white sm:text-xl">{style.name}</h3>
                    <p className="mt-1 hidden max-w-[220px] text-xs leading-relaxed text-white/80 sm:block">
                      {style.description}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
