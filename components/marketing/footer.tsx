import Link from "next/link";
import { Container } from "@/components/ui/container";
import { InstagramIcon, FacebookIcon } from "@/components/marketing/social-icons";
import { NAV_LINKS, siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-brand-border/70 bg-brand-ivory">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <span className="font-display text-2xl text-brand-ink">{siteConfig.name}</span>
          <p className="max-w-xs text-sm leading-relaxed text-brand-ink-soft/75">
            {siteConfig.description}
          </p>
          <div className="flex gap-3 pt-1">
            <a
              href={siteConfig.links.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-ink/15 text-brand-ink transition-colors hover:bg-brand-ink hover:text-brand-cream"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              href={siteConfig.links.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-ink/15 text-brand-ink transition-colors hover:bg-brand-ink hover:text-brand-cream"
            >
              <FacebookIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-sm uppercase tracking-[0.14em] text-brand-ink-soft/60">
            Explore
          </h3>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-brand-ink-soft/80 hover:text-brand-ink">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-sm uppercase tracking-[0.14em] text-brand-ink-soft/60">
            Company
          </h3>
          <Link href="/#testimonials" className="text-sm text-brand-ink-soft/80 hover:text-brand-ink">
            Testimonials
          </Link>
          <Link href="/#faq" className="text-sm text-brand-ink-soft/80 hover:text-brand-ink">
            FAQ
          </Link>
          <a href={`mailto:${siteConfig.contact.email}`} className="text-sm text-brand-ink-soft/80 hover:text-brand-ink">
            {siteConfig.contact.email}
          </a>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-sm uppercase tracking-[0.14em] text-brand-ink-soft/60">
            Legal
          </h3>
          <span className="text-sm text-brand-ink-soft/80">Privacy Policy</span>
          <span className="text-sm text-brand-ink-soft/80">Terms of Service</span>
        </div>
      </Container>

      <div className="border-t border-brand-border/70 py-6">
        <Container className="flex flex-col items-center justify-between gap-2 text-xs text-brand-ink-soft/60 sm:flex-row">
          <span>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</span>
          <span>Designed with AI. Delivered by humans.</span>
        </Container>
      </div>
    </footer>
  );
}
