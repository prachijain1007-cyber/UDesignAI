import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { FloatingWhatsAppButton } from "@/components/whatsapp/floating-whatsapp-button";
import { SessionTracker } from "@/components/providers/session-tracker";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionTracker />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingWhatsAppButton />
    </>
  );
}
