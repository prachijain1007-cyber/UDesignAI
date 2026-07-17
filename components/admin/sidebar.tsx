"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, MessagesSquare, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";
import { LogoutButton } from "@/components/admin/logout-button";
import type { AdminSessionPayload } from "@/lib/admin-auth";

const NAV = [
  { label: "Leads", href: "/admin/leads", icon: Users },
  { label: "Conversations", href: "/admin/conversations", icon: MessagesSquare },
  { label: "Analytics", href: "/admin/analytics", icon: LayoutDashboard },
] as const;

export function AdminSidebar({ admin }: { admin: AdminSessionPayload }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-white/10 bg-brand-ink p-5">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-2 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gold text-brand-ink">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-lg text-brand-cream">UDesign AI</span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-brand-gold/15 text-brand-gold"
                    : "text-brand-cream/60 hover:bg-white/5 hover:text-brand-cream"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
        <div className="px-3">
          <p className="text-sm text-brand-cream">{admin.name}</p>
          <p className="text-xs text-brand-cream/50">{admin.role}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
