"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TESTIMONIALS } from "@/lib/site";

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 sm:py-28">
      <Container className="flex flex-col items-center gap-14">
        <SectionHeading
          eyebrow="Loved by homeowners"
          title="Real rooms, real transformations"
          description="Thousands of homeowners have redesigned their spaces with UDesign AI. Here's what a few of them have to say."
        />

        <div className="grid w-full gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.figure
              key={testimonial.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex flex-col gap-5 rounded-3xl border border-brand-border bg-brand-ivory/60 p-8"
            >
              <Quote className="h-6 w-6 text-brand-gold" />
              <blockquote className="flex-1 text-sm leading-relaxed text-brand-ink-soft/90">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="flex items-center justify-between border-t border-brand-border pt-5">
                <div>
                  <p className="font-display text-base text-brand-ink">{testimonial.name}</p>
                  <p className="text-xs text-brand-ink-soft/60">{testimonial.location}</p>
                </div>
                <div className="flex">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-brand-gold text-brand-gold" />
                  ))}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
