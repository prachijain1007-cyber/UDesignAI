"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { NAV_LINKS, siteConfig } from "@/lib/site";
import { trackEvent } from "@/services/analytics-client";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-border/70 bg-brand-cream/85 backdrop-blur-md">
      <Container className="flex h-18 items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ink text-brand-gold">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-xl tracking-tight text-brand-ink">
            {siteConfig.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-brand-ink-soft/80 transition-colors hover:text-brand-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Button
            href="/studio"
            variant="gold"
            size="sm"
            onClick={() => trackEvent({ type: "CTA_CLICKED", metadata: { cta: "nav-try-studio" } })}
          >
            Try the Studio
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-ink/15 text-brand-ink"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </Container>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-brand-border/70 md:hidden"
          >
            <Container className="flex flex-col gap-1 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-brand-ink-soft/90 hover:bg-brand-ink/5"
                >
                  {link.label}
                </Link>
              ))}
              <Button href="/studio" variant="gold" size="md" className="mt-2 w-full" onClick={() => setOpen(false)}>
                Try the Studio
              </Button>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
