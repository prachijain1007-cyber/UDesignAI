"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-cream/60 transition-colors hover:bg-white/5 hover:text-brand-cream"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
