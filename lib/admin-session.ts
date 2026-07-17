import "server-only";
import { cookies } from "next/headers";
import { verifyAdminToken, type AdminSessionPayload } from "@/lib/admin-auth";
import { ADMIN_COOKIE_NAME } from "@/lib/constants";

export async function getCurrentAdmin(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
