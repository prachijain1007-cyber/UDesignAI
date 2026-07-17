"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { getCookie } from "@/utils/cookies";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { trackEvent } from "@/services/analytics-client";
import { cn } from "@/utils/cn";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function DesignChatPanel({ openingMessage }: { openingMessage?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    openingMessage ? [{ role: "assistant", content: openingMessage }] : []
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const sessionToken = getCookie(SESSION_COOKIE_NAME);
    if (!sessionToken) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    trackEvent({ type: "CHAT_OPENED", metadata: { source: "studio" } });

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, message: text }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I couldn't quite process that — mind trying again?" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting right now. Please try again shortly." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-brand-border bg-brand-ivory/60">
      <div className="flex items-center gap-3 border-b border-brand-border px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ink text-brand-gold">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-base text-brand-ink">Ask Mira</p>
          <p className="text-xs text-brand-ink-soft/60">Your AI-powered design consultant</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex max-h-80 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-brand-ink-soft/60">
            Ask about materials, budget, or how to bring this design to life.
          </p>
        )}
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              message.role === "user"
                ? "ml-auto bg-brand-ink text-brand-cream"
                : "bg-white text-brand-ink-soft/90 dark:bg-brand-ink-soft/10"
            )}
          >
            {message.content}
          </motion.div>
        ))}
        {sending && (
          <div className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3 dark:bg-brand-ink-soft/10">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-brand-gold-dark"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-brand-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about this design..."
          className="flex-1 rounded-full border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-gold dark:bg-brand-ink-soft/5"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold text-brand-ink transition-opacity disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
