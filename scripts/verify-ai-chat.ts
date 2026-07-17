// Live, end-to-end verification of the AI chat: real Gemini calls, real
// database writes. Not a unit test — this exercises the actual production
// code path (getOrCreateWebsiteConversation -> buildAIContextForSession ->
// runAssistantTurn) against live services, for manual verification only.
//
// Run with: npx tsx scripts/verify-ai-chat.ts
// Afterwards clean up the throwaway lead/session it creates with:
//   npx tsx scripts/cleanup-verification-data.ts
//
// Note: Gemini's free tier is rate-limited to a small number of requests
// per minute. If you see a 429/RESOURCE_EXHAUSTED error, wait ~30s and
// re-run — this is a quota limit, not a bug.
import { randomUUID } from "crypto";
import { getOrCreateWebsiteConversation } from "@/services/conversation-service";
import { buildAIContextForSession } from "@/services/context-builder";
import { runAssistantTurn } from "@/services/ai-designer";
import { prisma } from "@/lib/prisma";

const sessionToken = randomUUID();
console.log("Test session token:", sessionToken);

async function send(message: string) {
  const { session, lead, conversation } = await getOrCreateWebsiteConversation(sessionToken);
  const context = await buildAIContextForSession({
    sessionId: session.id,
    leadId: lead.id,
    channel: "WEBSITE_CHAT",
  });
  const result = await runAssistantTurn({
    conversationId: conversation.id,
    leadId: lead.id,
    sessionId: session.id,
    context,
    userMessage: message,
  });
  console.log(`\n> ${message}`);
  console.log(`< ${result.reply}`);
  console.log(`  (bookedConsultation=${result.bookedConsultation}, leadProfileUpdated=${result.leadProfileUpdated})`);
  return { result, leadId: lead.id, conversationId: conversation.id };
}

async function main() {
  console.log("\n=== TEST 1: basic chat ===");
  await send("Hi, I'm redoing my living room. What styles do you recommend?");

  console.log("\n=== TEST 2: conversation memory (referencing turn 1 without repeating context) ===");
  const memoryTurn = await send("Which of those would work best with a lot of natural light?");

  console.log("\n=== TEST 3: tool calling (lead qualification) ===");
  await send("My budget is around $8,000 and I want to start immediately, I own the place.");

  const leadAfterQualification = await prisma.lead.findUniqueOrThrow({ where: { id: memoryTurn.leadId } });
  console.log("Lead after qualification message:", {
    budget: leadAfterQualification.budget,
    timeline: leadAfterQualification.timeline,
    ownership: leadAfterQualification.ownership,
    score: leadAfterQualification.score,
    tier: leadAfterQualification.tier,
  });

  console.log("\n=== TEST 4: tool calling (consultation booking) ===");
  await send(
    "Great, let's book a consultation for August 5th at 2pm. My email is verify-test@udesignai.com and phone is +15550009999."
  );

  const consultations = await prisma.consultation.findMany({ where: { leadId: memoryTurn.leadId } });
  console.log("Consultations created for this lead:", consultations.length);
  if (consultations.length > 0) {
    console.log("  ->", consultations[0].preferredDate, consultations[0].preferredTime, consultations[0].email);
  }

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error("FAILED:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
