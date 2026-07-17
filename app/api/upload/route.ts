import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/services/storage";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const sessionToken = formData.get("sessionToken");
  const roomTypeGuess = formData.get("roomType");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (typeof sessionToken !== "string" || sessionToken.length === 0) {
    return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
  }

  const session = await prisma.visitorSession.upsert({
    where: { sessionToken },
    create: { sessionToken },
    update: {},
  });

  const stored = await saveUploadedFile(file);

  const image = await prisma.imageAsset.create({
    data: {
      sessionId: session.id,
      url: stored.url,
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      roomTypeGuess: typeof roomTypeGuess === "string" ? roomTypeGuess : undefined,
    },
  });

  await prisma.websiteEvent.create({
    data: {
      sessionId: session.id,
      type: "IMAGE_UPLOADED",
      metadata: { imageId: image.id },
    },
  });

  return NextResponse.json({ id: image.id, url: image.url }, { status: 201 });
}
