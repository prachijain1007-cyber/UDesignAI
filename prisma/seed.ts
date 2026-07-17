import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { AdminRole, type Ownership } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeLeadScore, type LeadScoringInput } from "@/lib/lead-scoring-rules";

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------

async function seedAdmins() {
  const ownerEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@udesignai.com";
  const ownerPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const owner = await prisma.adminUser.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      passwordHash: await bcrypt.hash(ownerPassword, 12),
      name: "UDesign AI Admin",
      role: AdminRole.OWNER,
    },
  });
  console.log(`Admin (owner): ${ownerEmail} / ${ownerPassword}`);

  const designer = await prisma.adminUser.upsert({
    where: { email: "maya@udesignai.com" },
    update: {},
    create: {
      email: "maya@udesignai.com",
      passwordHash: await bcrypt.hash("Designer123!", 12),
      name: "Maya Chen",
      role: AdminRole.DESIGNER,
    },
  });
  console.log(`Admin (designer): maya@udesignai.com / Designer123!`);

  return { owner, designer };
}

// ---------------------------------------------------------------------------
// Visitor sessions + website activity
// ---------------------------------------------------------------------------

const DEVICE_PROFILES = [
  { deviceType: "mobile", browser: "Safari", os: "iOS" },
  { deviceType: "desktop", browser: "Chrome", os: "Windows" },
  { deviceType: "desktop", browser: "Safari", os: "macOS" },
  { deviceType: "mobile", browser: "Chrome", os: "Android" },
  { deviceType: "tablet", browser: "Safari", os: "iOS" },
  { deviceType: "desktop", browser: "Firefox", os: "Linux" },
] as const;

const REFERRERS = [
  { referrer: "https://www.google.com/", utmSource: "google", utmMedium: "cpc", utmCampaign: "ai-interior-design" },
  { referrer: "https://www.instagram.com/", utmSource: "instagram", utmMedium: "social", utmCampaign: "reels-launch" },
  { referrer: null, utmSource: null, utmMedium: null, utmCampaign: null },
  { referrer: "https://www.pinterest.com/", utmSource: "pinterest", utmMedium: "social", utmCampaign: null },
  { referrer: "https://www.facebook.com/", utmSource: "facebook", utmMedium: "social", utmCampaign: "spring-promo" },
] as const;

const CTAS = ["hero-generate", "hero-consultation", "nav-try-studio", "pricing-plan", "style-gallery", "footer-band"];

function daysAgo(n: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

interface SessionSeed {
  landingPath: "/" | "/studio" | "/pricing";
  pageViews: number;
  timeOnSiteMs: number;
  whatsappClicked: boolean;
  ageDays: number;
}

const SESSION_SEEDS: SessionSeed[] = [
  { landingPath: "/", pageViews: 6, timeOnSiteMs: 240_000, whatsappClicked: true, ageDays: 0 },
  { landingPath: "/studio", pageViews: 4, timeOnSiteMs: 180_000, whatsappClicked: true, ageDays: 0 },
  { landingPath: "/", pageViews: 2, timeOnSiteMs: 45_000, whatsappClicked: false, ageDays: 1 },
  { landingPath: "/pricing", pageViews: 3, timeOnSiteMs: 90_000, whatsappClicked: true, ageDays: 1 },
  { landingPath: "/", pageViews: 8, timeOnSiteMs: 320_000, whatsappClicked: true, ageDays: 2 },
  { landingPath: "/studio", pageViews: 5, timeOnSiteMs: 210_000, whatsappClicked: false, ageDays: 3 },
  { landingPath: "/", pageViews: 1, timeOnSiteMs: 15_000, whatsappClicked: false, ageDays: 4 },
  { landingPath: "/pricing", pageViews: 3, timeOnSiteMs: 75_000, whatsappClicked: true, ageDays: 5 },
  { landingPath: "/studio", pageViews: 7, timeOnSiteMs: 260_000, whatsappClicked: true, ageDays: 6 },
  { landingPath: "/", pageViews: 2, timeOnSiteMs: 30_000, whatsappClicked: false, ageDays: 8 },
  { landingPath: "/", pageViews: 5, timeOnSiteMs: 150_000, whatsappClicked: true, ageDays: 10 },
  { landingPath: "/studio", pageViews: 4, timeOnSiteMs: 190_000, whatsappClicked: true, ageDays: 12 },
];

async function seedSessions() {
  const sessions = [];

  for (let i = 0; i < SESSION_SEEDS.length; i++) {
    const seed = SESSION_SEEDS[i];
    const device = DEVICE_PROFILES[i % DEVICE_PROFILES.length];
    const ref = REFERRERS[i % REFERRERS.length];
    const firstSeen = daysAgo(seed.ageDays, 9);

    const session = await prisma.visitorSession.create({
      data: {
        sessionToken: randomUUID(),
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        userAgent: `${device.browser}/1.0 (${device.os})`,
        referrer: ref.referrer,
        utmSource: ref.utmSource,
        utmMedium: ref.utmMedium,
        utmCampaign: ref.utmCampaign,
        landingPath: seed.landingPath,
        pageViews: seed.pageViews,
        timeOnSiteMs: seed.timeOnSiteMs,
        whatsappClicked: seed.whatsappClicked,
        firstSeenAt: firstSeen,
      },
    });
    sessions.push(session);

    const events: { type: import("@prisma/client").WebsiteEventType; path?: string; metadata?: object }[] = [
      { type: "PAGE_VIEW", path: "/" },
    ];
    if (seed.landingPath !== "/") events.push({ type: "PAGE_VIEW", path: seed.landingPath });
    if (seed.pageViews > 3) events.push({ type: "PAGE_VIEW", path: "/studio" });
    if (seed.landingPath === "/pricing" || seed.pageViews > 4) events.push({ type: "PRICING_VIEWED", path: "/pricing" });
    if (i % 3 === 0) events.push({ type: "STYLE_SELECTED", metadata: { style: "Scandinavian" } });
    if (i % 4 === 0) events.push({ type: "ROOM_SELECTED", metadata: { roomType: "Living Room" } });
    events.push({ type: "CTA_CLICKED", metadata: { cta: CTAS[i % CTAS.length] } });
    if (seed.whatsappClicked) events.push({ type: "WHATSAPP_CLICKED" });

    for (const event of events) {
      await prisma.websiteEvent.create({
        data: {
          sessionId: session.id,
          type: event.type,
          path: event.path,
          metadata: event.metadata,
          createdAt: firstSeen,
        },
      });
    }
  }

  // Most real visitors browse and leave without becoming a lead. Add plain
  // "bounce" sessions so the visitor→lead conversion rate looks like a real
  // funnel instead of leads outnumbering sessions.
  const BOUNCE_COUNT = 30;
  for (let i = 0; i < BOUNCE_COUNT; i++) {
    const device = DEVICE_PROFILES[i % DEVICE_PROFILES.length];
    const ref = REFERRERS[i % REFERRERS.length];
    const ageDays = i % 21;
    const firstSeen = daysAgo(ageDays, 9);
    const landingPath = (["/", "/", "/studio", "/pricing"] as const)[i % 4];

    const session = await prisma.visitorSession.create({
      data: {
        sessionToken: randomUUID(),
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        userAgent: `${device.browser}/1.0 (${device.os})`,
        referrer: ref.referrer,
        utmSource: ref.utmSource,
        utmMedium: ref.utmMedium,
        utmCampaign: ref.utmCampaign,
        landingPath,
        pageViews: 1 + (i % 3),
        timeOnSiteMs: 8_000 + (i % 5) * 6_000,
        whatsappClicked: false,
        firstSeenAt: firstSeen,
      },
    });
    sessions.push(session);

    await prisma.websiteEvent.create({
      data: { sessionId: session.id, type: "PAGE_VIEW", path: landingPath, createdAt: firstSeen },
    });
  }

  console.log(`Seeded ${sessions.length} visitor sessions with activity events.`);
  return sessions;
}

// ---------------------------------------------------------------------------
// Uploaded photos + AI-generated designs
// ---------------------------------------------------------------------------

const DESIGN_SEEDS = [
  { roomType: "Living Room", style: "Modern Minimalist" },
  { roomType: "Kitchen", style: "Scandinavian" },
  { roomType: "Bedroom", style: "Coastal" },
  { roomType: "Living Room", style: "Industrial" },
  { roomType: "Home Office", style: "Luxury Contemporary" },
  { roomType: "Dining Room", style: "Bohemian" },
] as const;

async function seedDesigns(sessions: Awaited<ReturnType<typeof seedSessions>>) {
  let count = 0;
  for (let i = 0; i < 6; i++) {
    const session = sessions[i];
    const design = DESIGN_SEEDS[i];

    const image = await prisma.imageAsset.create({
      data: {
        sessionId: session.id,
        url: `/uploads/seed-room-${i + 1}.jpg`,
        storageKey: `seed-room-${i + 1}.jpg`,
        mimeType: "image/jpeg",
        sizeBytes: 850_000 + i * 10_000,
        roomTypeGuess: design.roomType,
      },
    });

    await prisma.generatedDesign.create({
      data: {
        sessionId: session.id,
        roomType: design.roomType,
        style: design.style,
        sourceImageId: image.id,
        prompt: `${design.style} ${design.roomType}`,
        resultImageUrl: `/uploads/seed-design-${i + 1}.jpg`,
        status: "COMPLETED",
        createdAt: session.firstSeenAt,
      },
    });
    count++;
  }
  console.log(`Seeded ${count} uploaded photos + AI-generated designs.`);
}

// ---------------------------------------------------------------------------
// Leads (scored using the real scoring engine, not hardcoded tiers)
// ---------------------------------------------------------------------------

interface LeadSeed {
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  source: "WEBSITE" | "WHATSAPP" | "MANUAL";
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "CONSULTATION_BOOKED" | "WON" | "LOST";
  roomType?: string;
  style?: string;
  tags: string[];
  dealValue?: number;
  qualification: LeadScoringInput;
  assignToDesigner?: boolean;
  ageDays: number;
}

const LEAD_SEEDS: LeadSeed[] = [
  {
    name: "Priya Kapoor",
    email: "priya.kapoor@example.com",
    phone: "+919812345001",
    source: "WEBSITE",
    status: "WON",
    roomType: "Living Room",
    style: "Modern Minimalist",
    tags: ["repeat-customer", "referral"],
    dealValue: 2400,
    qualification: { budget: "2k_10k", timeline: "immediately", urgency: "high", projectSize: "single_room", ownership: "OWNER", decisionReadiness: "ready_to_book" },
    assignToDesigner: true,
    ageDays: 14,
  },
  {
    name: "Marcus Tan",
    email: "marcus.tan@example.com",
    phone: "+16505550101",
    source: "WEBSITE",
    status: "WON",
    roomType: "Kitchen",
    style: "Scandinavian",
    tags: ["full-home"],
    dealValue: 8200,
    qualification: { budget: "50k_plus", timeline: "immediately", urgency: "high", projectSize: "full_home", ownership: "OWNER", decisionReadiness: "ready_to_book" },
    assignToDesigner: true,
    ageDays: 20,
  },
  {
    name: "Ananya Rao",
    whatsappNumber: "+919845012345",
    source: "WHATSAPP",
    status: "CONSULTATION_BOOKED",
    roomType: "Living Room",
    style: "Scandinavian",
    tags: ["hot-lead"],
    qualification: { budget: "10k_50k", timeline: "1_3_months", urgency: "high", projectSize: "multi_room", ownership: "OWNER", decisionReadiness: "ready_to_book" },
    assignToDesigner: true,
    ageDays: 1,
  },
  {
    name: "James Whitfield",
    email: "j.whitfield@example.com",
    phone: "+442071838750",
    source: "WEBSITE",
    status: "CONSULTATION_BOOKED",
    roomType: "Home Office",
    style: "Luxury Contemporary",
    tags: [],
    qualification: { budget: "10k_50k", timeline: "immediately", urgency: "high", projectSize: "single_room", ownership: "OWNER", decisionReadiness: "ready_to_book" },
    assignToDesigner: true,
    ageDays: 0,
  },
  {
    name: "Sofia Alvarez",
    whatsappNumber: "+34911234567",
    source: "WHATSAPP",
    status: "QUALIFIED",
    roomType: "Bedroom",
    style: "Coastal",
    tags: ["needs-followup"],
    qualification: { budget: "2k_10k", timeline: "3_6_months", urgency: "medium", projectSize: "single_room", ownership: "RENTER", decisionReadiness: "comparing_options" },
    ageDays: 3,
  },
  {
    name: "David Okafor",
    email: "david.okafor@example.com",
    source: "WEBSITE",
    status: "QUALIFIED",
    roomType: "Living Room",
    style: "Industrial",
    tags: [],
    qualification: { budget: "10k_50k", timeline: "1_3_months", urgency: "medium", projectSize: "multi_room", ownership: "OWNER", decisionReadiness: "comparing_options" },
    ageDays: 2,
  },
  {
    name: "Grace Liu",
    email: "grace.liu@example.com",
    source: "WEBSITE",
    status: "CONTACTED",
    roomType: "Dining Room",
    style: "Bohemian",
    tags: [],
    qualification: { budget: "under_2k", timeline: "6_plus_months", urgency: "low", projectSize: "single_room", ownership: "RENTER", decisionReadiness: "early_research" },
    ageDays: 5,
  },
  {
    name: "Tom Bennett",
    whatsappNumber: "+14165550199",
    source: "WHATSAPP",
    status: "CONTACTED",
    tags: [],
    qualification: { budget: "unsure", timeline: "just_browsing", urgency: "low", ownership: "UNSURE", decisionReadiness: "early_research" },
    ageDays: 6,
  },
  {
    name: "Emma Rossi",
    email: "emma.rossi@example.com",
    source: "WEBSITE",
    status: "NEW",
    roomType: "Kitchen",
    style: "Modern Minimalist",
    tags: [],
    qualification: {},
    ageDays: 0,
  },
  {
    name: "Noah Kim",
    email: "noah.kim@example.com",
    source: "WEBSITE",
    status: "NEW",
    tags: [],
    qualification: {},
    ageDays: 1,
  },
  {
    name: "Isabella Fontaine",
    whatsappNumber: "+33612345678",
    source: "WHATSAPP",
    status: "LOST",
    roomType: "Bathroom",
    tags: ["went-with-competitor"],
    qualification: { budget: "under_2k", timeline: "just_browsing", urgency: "low", projectSize: "single_room", ownership: "RENTER", decisionReadiness: "early_research" },
    ageDays: 25,
  },
  {
    name: "Ryan Patel",
    email: "ryan.patel@example.com",
    source: "MANUAL",
    status: "LOST",
    tags: ["budget-mismatch"],
    qualification: { budget: "under_2k", timeline: "6_plus_months", urgency: "low", ownership: "RENTER", decisionReadiness: "early_research" },
    ageDays: 18,
  },
  {
    name: "Chloe Anderson",
    email: "chloe.anderson@example.com",
    phone: "+61412345678",
    source: "WEBSITE",
    status: "QUALIFIED",
    roomType: "Kids Room",
    style: "Coastal",
    tags: ["multi-room"],
    qualification: { budget: "2k_10k", timeline: "1_3_months", urgency: "medium", projectSize: "multi_room", ownership: "OWNER", decisionReadiness: "comparing_options" },
    ageDays: 4,
  },
  {
    name: "Lucas Meyer",
    whatsappNumber: "+4915112345678",
    source: "WHATSAPP",
    status: "NEW",
    roomType: "Balcony",
    tags: [],
    qualification: { timeline: "just_browsing" },
    ageDays: 0,
  },
];

async function seedLeads(sessions: Awaited<ReturnType<typeof seedSessions>>, designer: { id: string }) {
  const leads = [];
  let nextSessionIndex = 0;

  for (let i = 0; i < LEAD_SEEDS.length; i++) {
    const seed = LEAD_SEEDS[i];
    const { score, tier, reason } = computeLeadScore(seed.qualification);
    const createdAt = daysAgo(seed.ageDays, 10 + (i % 8));
    // Lead.sessionId is unique, so each WEBSITE-sourced lead must get its own
    // never-reused session — a shared modulo index would collide once it wraps.
    const session =
      seed.source === "WEBSITE" && nextSessionIndex < sessions.length
        ? sessions[nextSessionIndex++]
        : null;

    const lead = await prisma.lead.create({
      data: {
        sessionId: session?.id,
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        whatsappNumber: seed.whatsappNumber,
        source: seed.source,
        status: seed.status,
        score,
        tier,
        budget: seed.qualification.budget ?? undefined,
        timeline: seed.qualification.timeline ?? undefined,
        urgency: seed.qualification.urgency ?? undefined,
        projectSize: seed.qualification.projectSize ?? undefined,
        ownership: (seed.qualification.ownership as Ownership | undefined) ?? undefined,
        decisionReadiness: seed.qualification.decisionReadiness ?? undefined,
        roomType: seed.roomType,
        style: seed.style,
        tags: seed.tags,
        dealValue: seed.dealValue,
        assignedToId: seed.assignToDesigner ? designer.id : undefined,
        createdAt,
        updatedAt: createdAt,
      },
    });

    await prisma.leadScoreHistory.create({
      data: { leadId: lead.id, score, tier, reason, createdAt },
    });

    leads.push(lead);
  }

  console.log(`Seeded ${leads.length} leads spanning HOT/WARM/COLD and every status.`);
  return leads;
}

// ---------------------------------------------------------------------------
// Notes on a few leads
// ---------------------------------------------------------------------------

async function seedNotes(leads: Awaited<ReturnType<typeof seedLeads>>, owner: { id: string }, designer: { id: string }) {
  const notePlans: [number, string, string][] = [
    [0, designer.id, "Called to confirm delivery timeline — thrilled with the final reveal photos."],
    [1, designer.id, "Full-home project; scheduling a second walkthrough for the kitchen sourcing."],
    [2, designer.id, "Sent shoppable list on WhatsApp, waiting on confirmation for the consultation slot."],
    [4, owner.id, "Comparing us against two other studios — following up with a portfolio deck."],
    [6, owner.id, "Budget too low for a full renovation; suggested the AI Starter plan instead."],
  ];

  for (const [index, adminUserId, body] of notePlans) {
    const lead = leads[index];
    if (!lead) continue;
    await prisma.leadNote.create({ data: { leadId: lead.id, adminUserId, body } });
  }
  console.log(`Seeded ${notePlans.length} lead notes.`);
}

// ---------------------------------------------------------------------------
// Consultations
// ---------------------------------------------------------------------------

async function seedConsultations(leads: Awaited<ReturnType<typeof seedLeads>>) {
  const plans: [number, string, string, "REQUESTED" | "CONFIRMED" | "COMPLETED"][] = [
    [0, "2026-07-05", "3:00 PM", "COMPLETED"],
    [1, "2026-07-10", "11:00 AM", "COMPLETED"],
    [2, "2026-07-20", "4:30 PM", "CONFIRMED"],
    [3, "2026-07-19", "10:00 AM", "REQUESTED"],
  ];

  for (const [index, preferredDate, preferredTime, status] of plans) {
    const lead = leads[index];
    if (!lead) continue;
    await prisma.consultation.create({
      data: {
        leadId: lead.id,
        preferredDate,
        preferredTime,
        email: lead.email ?? "no-email-on-file@udesignai.com",
        phone: lead.phone ?? lead.whatsappNumber ?? "unknown",
        status,
        notes: "Discuss layout, budget breakdown, and sourcing timeline.",
      },
    });
  }
  console.log(`Seeded ${plans.length} consultations.`);
}

// ---------------------------------------------------------------------------
// Conversations + messages
// ---------------------------------------------------------------------------

interface ConversationSeed {
  leadIndex: number;
  channel: "WEBSITE_CHAT" | "WHATSAPP";
  messages: { role: "USER" | "ASSISTANT"; content: string }[];
}

const CONVERSATION_SEEDS: ConversationSeed[] = [
  {
    leadIndex: 0,
    channel: "WHATSAPP",
    messages: [
      { role: "USER", content: "Hi! I just generated a Modern Minimalist Living Room design and I'd love your take on it. [ref: seed]" },
      { role: "ASSISTANT", content: "Hi Priya! That concept is gorgeous — the light oak tones will play beautifully with your existing windows. Are you thinking of tackling the whole room or starting with seating and lighting?" },
      { role: "USER", content: "Whole room ideally, budget around $2-10k." },
      { role: "ASSISTANT", content: "That's a great range for a full refresh here. Want me to lock in a consultation so we can turn this into a shoppable plan?" },
      { role: "USER", content: "Yes let's do it, this week if possible." },
      { role: "ASSISTANT", content: "You're all set for the 5th at 3pm — I'll have a designer confirm shortly!" },
    ],
  },
  {
    leadIndex: 2,
    channel: "WHATSAPP",
    messages: [
      { role: "USER", content: "Hi! I'm interested in a Scandinavian Living Room and would love some guidance. [ref: seed]" },
      { role: "ASSISTANT", content: "Hi Ananya! Scandinavian is such a lovely fit for a living room — light woods, soft textiles, lots of breathing room. Is this a room you own, and roughly what's your timeline?" },
      { role: "USER", content: "I own the flat, would love to start immediately if budget allows — maybe $15k." },
      { role: "ASSISTANT", content: "That's a healthy budget for a multi-room refresh too, if you wanted to extend it. Should I get a designer on a call with you this week?" },
      { role: "USER", content: "Yes please, tomorrow afternoon works." },
    ],
  },
  {
    leadIndex: 4,
    channel: "WEBSITE_CHAT",
    messages: [
      { role: "USER", content: "How accurate are the AI designs really?" },
      { role: "ASSISTANT", content: "Great question — our AI respects your room's real dimensions and lighting, so it's grounded in your actual space, not a generic render. What room are you working on?" },
      { role: "USER", content: "A rented bedroom, so nothing too permanent." },
      { role: "ASSISTANT", content: "Totally doable — we can focus on textiles, lighting and furniture that travel well when you move. Want me to note that down for when you're ready to book?" },
    ],
  },
  {
    leadIndex: 6,
    channel: "WEBSITE_CHAT",
    messages: [
      { role: "USER", content: "What's included in the free plan?" },
      { role: "ASSISTANT", content: "The AI Starter plan gets you 3 AI room designs a month across any style, shareable boards, and WhatsApp access to a designer whenever you're ready. No credit card needed." },
      { role: "USER", content: "Good, just browsing for now, thanks." },
    ],
  },
];

async function seedConversations(leads: Awaited<ReturnType<typeof seedLeads>>) {
  let count = 0;
  for (const seed of CONVERSATION_SEEDS) {
    const lead = leads[seed.leadIndex];
    if (!lead) continue;

    const conversation = await prisma.conversation.create({
      data: {
        leadId: lead.id,
        sessionId: lead.sessionId ?? undefined,
        channel: seed.channel,
        whatsappPhone: seed.channel === "WHATSAPP" ? lead.whatsappNumber : undefined,
        status: "ACTIVE",
      },
    });

    for (const message of seed.messages) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: message.role,
          content: message.content,
        },
      });
    }
    count++;
  }
  console.log(`Seeded ${count} conversations with realistic message history.`);
}

// ---------------------------------------------------------------------------

async function main() {
  const { owner, designer } = await seedAdmins();

  const existingSessionCount = await prisma.visitorSession.count();
  if (existingSessionCount > 0) {
    console.log("Sample data already present (visitor_sessions is non-empty) — skipping.");
    return;
  }

  const sessions = await seedSessions();
  await seedDesigns(sessions);
  const leads = await seedLeads(sessions, designer);
  await seedNotes(leads, owner, designer);
  await seedConsultations(leads);
  await seedConversations(leads);

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
