import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateDesignImage } from "@/services/design-generator";

const requestSchema = z.object({
  sessionToken: z.string().min(1),
  roomType: z.string().min(1),
  style: z.string().min(1),
  sourceImageId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sessionToken, roomType, style, sourceImageId } = parsed.data;

  const session = await prisma.visitorSession.upsert({
    where: { sessionToken },
    create: { sessionToken },
    update: {},
  });

  const sourceImage = sourceImageId
    ? await prisma.imageAsset.findUnique({ where: { id: sourceImageId } })
    : null;

  const design = await prisma.generatedDesign.create({
    data: {
      sessionId: session.id,
      roomType,
      style,
      sourceImageId: sourceImage?.id,
      prompt: `${style} ${roomType}`,
      status: "PENDING",
    },
  });

  try {
    const { url } = await generateDesignImage({
      roomType,
      style,
      sourceImageUrl: sourceImage?.url ?? null,
    });

    const completed = await prisma.generatedDesign.update({
      where: { id: design.id },
      data: { status: "COMPLETED", resultImageUrl: url },
    });

    await prisma.websiteEvent.create({
      data: {
        sessionId: session.id,
        type: "DESIGN_GENERATED",
        metadata: { designId: design.id, roomType, style },
      },
    });

    return NextResponse.json(completed, { status: 201 });
  } catch (error) {
    console.error("[designs] generation failed", error);
    await prisma.generatedDesign.update({
      where: { id: design.id },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { error: "We couldn't generate your design right now. Please try again in a moment." },
      { status: 502 }
    );
  }
}
