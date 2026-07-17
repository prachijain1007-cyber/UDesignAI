import path from "path";
import { readFile } from "fs/promises";
import { toFile } from "openai";
import { getOpenAIClient } from "@/services/openai-client";
import { saveUploadedFile } from "@/services/storage";

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

async function readSourceImageBuffer(sourceUrl: string): Promise<Buffer> {
  if (sourceUrl.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", sourceUrl);
    return readFile(filePath);
  }
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Failed to fetch source image: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function buildDesignPrompt(roomType: string, style: string): string {
  return `Redesign this ${roomType} in a ${style} interior design style. Keep the room's architecture, windows and layout, but transform furniture, materials, color palette, lighting and decor to be a cohesive, photorealistic, professionally styled ${style} ${roomType}. High-end interior photography, natural light, no people, no text overlays.`;
}

function buildConceptPrompt(roomType: string, style: string): string {
  return `A photorealistic, professionally styled ${style} ${roomType} interior design concept. High-end interior photography, natural light, tasteful furniture and decor, no people, no text overlays.`;
}

async function extractImageBuffer(data: { b64_json?: string; url?: string }): Promise<Buffer> {
  if (data.b64_json) return Buffer.from(data.b64_json, "base64");
  if (data.url) {
    const res = await fetch(data.url);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Image generation response contained no image data");
}

export async function generateDesignImage(params: {
  roomType: string;
  style: string;
  sourceImageUrl?: string | null;
}): Promise<{ url: string }> {
  const openai = getOpenAIClient();

  let buffer: Buffer;

  if (params.sourceImageUrl) {
    const sourceBuffer = await readSourceImageBuffer(params.sourceImageUrl);
    const uploadableImage = await toFile(sourceBuffer, "room.png", { type: "image/png" });

    const result = await openai.images.edit({
      model: IMAGE_MODEL,
      image: uploadableImage,
      prompt: buildDesignPrompt(params.roomType, params.style),
    });

    const image = result.data?.[0];
    if (!image) throw new Error("No image returned from edit");
    buffer = await extractImageBuffer(image);
  } else {
    const result = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt: buildConceptPrompt(params.roomType, params.style),
      size: "1024x1024",
    });

    const image = result.data?.[0];
    if (!image) throw new Error("No image returned from generate");
    buffer = await extractImageBuffer(image);
  }

  const file = new File([new Uint8Array(buffer)], `design-${Date.now()}.png`, { type: "image/png" });
  const stored = await saveUploadedFile(file);
  return { url: stored.url };
}
