// Removes the throwaway leads/sessions/conversations created by manual
// verification runs (scripts/verify-ai-chat.ts). Verification leads are
// identifiable as having no name and either no contact info or the fixed
// verify-test@udesignai.com address used by the booking test.
import { prisma } from "@/lib/prisma";

async function main() {
  const testLeads = await prisma.lead.findMany({
    where: {
      name: null,
      OR: [{ email: "verify-test@udesignai.com" }, { AND: [{ email: null }, { phone: null }, { whatsappNumber: null }] }],
    },
    select: { id: true, sessionId: true },
  });

  console.log(`Found ${testLeads.length} verification lead(s) to remove.`);
  const leadIds = testLeads.map((l) => l.id);
  const sessionIds = testLeads.map((l) => l.sessionId).filter((id): id is string => Boolean(id));

  if (leadIds.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  await prisma.consultation.deleteMany({ where: { leadId: { in: leadIds } } });
  await prisma.conversation.deleteMany({ where: { leadId: { in: leadIds } } });
  await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
  if (sessionIds.length > 0) {
    await prisma.visitorSession.deleteMany({ where: { id: { in: sessionIds } } });
  }

  console.log(`Removed ${leadIds.length} lead(s) and ${sessionIds.length} session(s).`);
}

main()
  .catch((err) => {
    console.error("FAILED:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
