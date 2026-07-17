"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Upload, Sparkles, Loader2, ImageIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { DesignChatPanel } from "@/components/chat/design-chat-panel";
import { ROOM_TYPES, DESIGN_STYLES } from "@/lib/site";
import { cn } from "@/utils/cn";
import { getCookie } from "@/utils/cookies";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { updateSessionContext } from "@/lib/session-context";
import { trackEvent } from "@/services/analytics-client";

interface GeneratedDesignResult {
  id: string;
  resultImageUrl: string | null;
  status: string;
}

export function RoomDesignStudio() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roomType, setRoomType] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(searchParams.get("style"));
  const [uploadedImage, setUploadedImage] = useState<{ id: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [design, setDesign] = useState<GeneratedDesignResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialStyle = searchParams.get("style");
    if (initialStyle) {
      const sessionToken = getCookie(SESSION_COOKIE_NAME);
      if (sessionToken) updateSessionContext(sessionToken, { selectedStyle: initialStyle });
    }
  }, [searchParams]);

  function selectRoomType(value: string) {
    setRoomType(value);
    const sessionToken = getCookie(SESSION_COOKIE_NAME);
    if (sessionToken) updateSessionContext(sessionToken, { selectedRoomType: value });
    trackEvent({ type: "ROOM_SELECTED", metadata: { roomType: value } });
  }

  function selectStyle(value: string) {
    setStyle(value);
    const sessionToken = getCookie(SESSION_COOKIE_NAME);
    if (sessionToken) updateSessionContext(sessionToken, { selectedStyle: value });
    trackEvent({ type: "STYLE_SELECTED", metadata: { style: value } });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const sessionToken = getCookie(SESSION_COOKIE_NAME);
    if (!sessionToken) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionToken", sessionToken);
      if (roomType) formData.append("roomType", roomType);

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Upload failed");

      setUploadedImage({ id: data.id, url: data.url });
      updateSessionContext(sessionToken, { uploadedImage: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    if (!roomType || !style) return;
    const sessionToken = getCookie(SESSION_COOKIE_NAME);
    if (!sessionToken) return;

    setGenerating(true);
    setError(null);
    setDesign(null);

    try {
      const response = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          roomType,
          style,
          sourceImageId: uploadedImage?.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Generation failed");

      setDesign(data);
      updateSessionContext(sessionToken, {
        lastGeneratedDesignId: data.id,
        lastGeneratedDesignSummary: `a ${style} ${roomType} design`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = Boolean(roomType && style) && !generating;

  return (
    <Container className="flex flex-col gap-12 pb-24 pt-16 sm:pt-24">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-gold-dark dark:text-brand-gold">
          The Studio
        </span>
        <h1 className="font-display text-4xl text-brand-ink sm:text-5xl">
          Design your room in three steps
        </h1>
        <p className="text-brand-ink-soft/75">
          Pick a room, pick a style, optionally upload a photo — then let AI do the rest.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="mb-3 font-display text-lg text-brand-ink">1. Choose your room</h2>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => selectRoomType(room)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    roomType === room
                      ? "border-brand-gold bg-brand-gold text-brand-ink"
                      : "border-brand-border text-brand-ink-soft/80 hover:border-brand-gold/50"
                  )}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg text-brand-ink">2. Choose a style</h2>
            <div className="flex flex-wrap gap-2">
              {DESIGN_STYLES.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => selectStyle(s.name)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    style === s.name
                      ? "border-brand-gold bg-brand-gold text-brand-ink"
                      : "border-brand-border text-brand-ink-soft/80 hover:border-brand-gold/50"
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg text-brand-ink">
              3. Upload a photo <span className="text-brand-ink-soft/50">(optional)</span>
            </h2>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-border bg-brand-ivory/40 py-10 text-brand-ink-soft/70 transition-colors hover:border-brand-gold/60"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-brand-gold-dark" />
              ) : uploadedImage ? (
                <ImageIcon className="h-6 w-6 text-brand-gold-dark" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
              <span className="text-sm">
                {uploadedImage ? "Photo uploaded — tap to replace" : "Click to upload a room photo"}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {error && <p className="text-sm text-brand-terracotta">{error}</p>}

          <Button variant="gold" size="lg" onClick={handleGenerate} disabled={!canGenerate}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Designing your room...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate My Design
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative aspect-square overflow-hidden rounded-3xl border border-brand-border bg-brand-ivory/60"
          >
            {design?.resultImageUrl ? (
              <Image
                src={design.resultImageUrl}
                alt={`${style} ${roomType} AI-generated design`}
                fill
                className="object-cover"
                unoptimized={design.resultImageUrl.startsWith("http")}
              />
            ) : uploadedImage ? (
              <Image src={uploadedImage.url} alt="Uploaded room" fill className="object-cover opacity-70" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-brand-ink-soft/40">
                <Sparkles className="h-8 w-8" />
                <p className="text-sm">Your design will appear here</p>
              </div>
            )}
          </motion.div>

          {design && <DesignChatPanel openingMessage={`Love how your ${style} ${roomType} turned out? Ask me anything about materials, budget, or next steps.`} />}
        </div>
      </div>
    </Container>
  );
}
