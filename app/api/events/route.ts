import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDeviceInfo } from "@/lib/device";
import { trackEventSchema } from "@/lib/validations";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(request, "events", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = trackEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    sessionToken,
    type,
    path,
    metadata,
    timeOnPageMs,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
  } = parsed.data;

  const userAgent = request.headers.get("user-agent") ?? "";
  const device = parseDeviceInfo(userAgent);

  try {
    const session = await prisma.visitorSession.upsert({
      where: { sessionToken },
      create: {
        sessionToken,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        userAgent,
        referrer: referrer ?? request.headers.get("referer") ?? undefined,
        utmSource,
        utmMedium,
        utmCampaign,
        landingPath: path,
        pageViews: type === "PAGE_VIEW" ? 1 : 0,
        whatsappClicked: type === "WHATSAPP_CLICKED",
        timeOnSiteMs: timeOnPageMs ?? 0,
      },
      update: {
        pageViews: type === "PAGE_VIEW" ? { increment: 1 } : undefined,
        whatsappClicked: type === "WHATSAPP_CLICKED" ? true : undefined,
        timeOnSiteMs: timeOnPageMs ? { increment: timeOnPageMs } : undefined,
      },
    });

    await prisma.websiteEvent.create({
      data: {
        sessionId: session.id,
        type,
        path,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });

    return NextResponse.json({ ok: true, sessionId: session.id }, { status: 201 });
  } catch (error) {
    console.error("[events] failed to record event", error);
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}
