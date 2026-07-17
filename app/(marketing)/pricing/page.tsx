import type { Metadata } from "next";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for AI-generated interior design concepts and expert designer consultations.",
};

export default function PricingPage() {
  return (
    <div className="pt-16 sm:pt-24">
      <PricingSection />
      <FAQ />
      <CTASection />
    </div>
  );
}
