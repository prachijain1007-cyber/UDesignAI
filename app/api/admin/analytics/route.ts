import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-session";
import { getDashboardAnalytics } from "@/services/analytics-service";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const analytics = await getDashboardAnalytics();
  return NextResponse.json(analytics);
}
