import { SignJWT, jwtVerify } from "jose";
import type { AdminRole } from "@prisma/client";

const encoder = new TextEncoder();

function getSecretKey() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET is not set");
  }
  return encoder.encode(secret);
}

export interface AdminSessionPayload {
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
}

const SESSION_DURATION = "7d";

export async function signAdminToken(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifyAdminToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || !payload.email || !payload.role) return null;
    return payload as unknown as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function hasPermission(role: AdminRole, required: AdminRole[]): boolean {
  return required.includes(role);
}
