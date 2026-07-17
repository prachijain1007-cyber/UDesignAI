import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ConsultationForm } from "@/components/marketing/consultation-form";

export const metadata: Metadata = {
  title: "Book a Free Consultation",
  description: "Book a free 1:1 consultation with a UDesign AI interior designer.",
};

export default function ConsultationPage() {
  return (
    <Container className="flex flex-col items-center gap-12 py-16 sm:py-24">
      <SectionHeading
        eyebrow="Consultation"
        title="Let's talk about your space"
        description="Tell us a bit about your project and preferred time — a designer will confirm within one business day."
      />
      <div className="w-full max-w-xl">
        <ConsultationForm />
      </div>
    </Container>
  );
}
