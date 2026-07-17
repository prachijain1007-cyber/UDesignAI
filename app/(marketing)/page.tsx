import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { StyleGallery } from "@/components/marketing/style-gallery";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Testimonials } from "@/components/marketing/testimonials";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "AI Interior Design That Feels Human",
  description:
    "Upload a photo of any room and get stunning AI-generated interior design concepts in seconds, then continue with a real designer on WhatsApp.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <StyleGallery />
      <PricingSection />
      <Testimonials />
      <FAQ />
      <CTASection />
    </>
  );
}
