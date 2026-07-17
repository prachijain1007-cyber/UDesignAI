"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WhatsAppIcon } from "./whatsapp-icon";
import { siteConfig } from "@/lib/site";
import { getCookie } from "@/utils/cookies";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { getSessionContext } from "@/lib/session-context";
import { buildWhatsAppContextMessage, buildWhatsAppLink } from "@/lib/whatsapp-context";
import { trackEvent } from "@/services/analytics-client";

export function FloatingWhatsAppButton() {
  const [visible, setVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 900);
    const tooltipTimer = setTimeout(() => setShowTooltip(true), 3500);
    const hideTooltip = setTimeout(() => setShowTooltip(false), 8500);
    return () => {
      clearTimeout(timer);
      clearTimeout(tooltipTimer);
      clearTimeout(hideTooltip);
    };
  }, []);

  function handleClick() {
    const sessionToken = getCookie(SESSION_COOKIE_NAME);
    const context = sessionToken
      ? getSessionContext(sessionToken)
      : { sessionToken: "anonymous", firstVisitAt: new Date().toISOString(), visitedPaths: [] };

    const message = buildWhatsAppContextMessage(context);
    const link = buildWhatsAppLink(siteConfig.contact.whatsappNumber, message);

    trackEvent({
      type: "WHATSAPP_CLICKED",
      metadata: {
        hasGeneratedDesign: Boolean(context.lastGeneratedDesignSummary),
        selectedStyle: context.selectedStyle,
        selectedRoomType: context.selectedRoomType,
      },
    });

    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      <AnimatePresence>
        {visible && showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="max-w-[220px] rounded-2xl rounded-br-sm border border-brand-border bg-brand-ivory px-4 py-3 shadow-xl"
          >
            <p className="font-display text-sm text-brand-ink">
              Chat with a real designer, right now.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            onClick={handleClick}
            onMouseEnter={() => setShowTooltip(true)}
            initial={{ opacity: 0, scale: 0.4, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.65)] ring-4 ring-brand-gold/30 focus:outline-none focus-visible:ring-brand-gold"
            aria-label="Chat with UDesign AI on WhatsApp"
          >
            <span className="absolute inset-0 rounded-full bg-[#25D366]/60 animate-pulse-ring" />
            <WhatsAppIcon className="relative h-8 w-8" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
