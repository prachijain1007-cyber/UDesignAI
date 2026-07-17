import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Conversations", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      lead: { select: { id: true, name: true, email: true, whatsappNumber: true, tier: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-brand-ink">Conversations</h1>
        <p className="text-sm text-brand-ink-soft/60">All AI conversations across the website and WhatsApp.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-brand-border bg-brand-ivory/60 text-xs uppercase tracking-wide text-brand-ink-soft/60">
            <tr>
              <th className="px-5 py-3">Lead</th>
              <th className="px-5 py-3">Channel</th>
              <th className="px-5 py-3">Last message</th>
              <th className="px-5 py-3">Messages</th>
              <th className="px-5 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((conversation) => (
              <tr key={conversation.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-ivory/40">
                <td className="px-5 py-3">
                  {conversation.lead ? (
                    <Link
                      href={`/admin/leads/${conversation.lead.id}`}
                      className="font-medium text-brand-ink hover:text-brand-gold-dark"
                    >
                      {conversation.lead.name ?? conversation.lead.email ?? conversation.lead.whatsappNumber ?? "Unnamed"}
                    </Link>
                  ) : (
                    <span className="text-brand-ink-soft/50">Unlinked</span>
                  )}
                </td>
                <td className="px-5 py-3 text-brand-ink-soft/70">
                  {conversation.channel === "WHATSAPP" ? "WhatsApp" : "Website Chat"}
                </td>
                <td className="max-w-xs truncate px-5 py-3 text-brand-ink-soft/70">
                  {conversation.messages[0]?.content ?? "—"}
                </td>
                <td className="px-5 py-3 text-brand-ink-soft/70">{conversation._count.messages}</td>
                <td className="px-5 py-3 text-brand-ink-soft/50">
                  {new Date(conversation.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {conversations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-brand-ink-soft/50">
                  No conversations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
