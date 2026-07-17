import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { verifyAdminToken } from "@/lib/admin-auth";
import { ADMIN_COOKIE_NAME } from "@/lib/constants";

const mockPrisma = {
  adminUser: { findUnique: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { POST, DELETE } = await import("./route");

function loginRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/auth", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/admin/auth (login)", () => {
  const REAL_PASSWORD = "SuperSecret123!";
  let passwordHash: string;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.stubEnv("ADMIN_JWT_SECRET", "test-admin-jwt-secret");
    passwordHash = await bcrypt.hash(REAL_PASSWORD, 10);
    mockPrisma.adminUser.update.mockResolvedValue({});
  });

  it("logs in with correct credentials, sets an httpOnly session cookie carrying the right identity", async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValueOnce({
      id: "admin_1",
      email: "owner@udesignai.com",
      name: "Studio Owner",
      role: "OWNER",
      passwordHash,
    });

    const response = await POST(loginRequest({ email: "owner@udesignai.com", password: REAL_PASSWORD }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({
      ok: true,
      admin: { id: "admin_1", name: "Studio Owner", email: "owner@udesignai.com", role: "OWNER" },
    });
    expect(body.admin.passwordHash).toBeUndefined();

    const setCookie = response.cookies.get(ADMIN_COOKIE_NAME);
    expect(setCookie).toBeDefined();
    expect(setCookie!.httpOnly).toBe(true);

    // The issued token must actually verify and carry the right claims.
    const session = await verifyAdminToken(setCookie!.value);
    expect(session).toMatchObject({ sub: "admin_1", email: "owner@udesignai.com", role: "OWNER" });

    expect(mockPrisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: "admin_1" },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it("rejects an incorrect password with a generic error and no cookie", async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValueOnce({
      id: "admin_1",
      email: "owner@udesignai.com",
      name: "Studio Owner",
      role: "OWNER",
      passwordHash,
    });

    const response = await POST(loginRequest({ email: "owner@udesignai.com", password: "wrong-password" }));
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid email or password");
    expect(response.cookies.get(ADMIN_COOKIE_NAME)).toBeUndefined();
  });

  it("rejects an unknown email with the exact same generic error (no account-existence leak)", async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValueOnce(null);

    const response = await POST(loginRequest({ email: "nobody@udesignai.com", password: REAL_PASSWORD }));
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid email or password");
  });

  it("rejects a malformed payload before ever touching the database", async () => {
    const response = await POST(loginRequest({ email: "not-an-email", password: "short" }));
    expect(response.status).toBe(400);
    expect(mockPrisma.adminUser.findUnique).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/auth (logout)", () => {
  it("clears the admin session cookie", async () => {
    const response = await DELETE();
    const cookie = response.cookies.get(ADMIN_COOKIE_NAME);
    // Deleting a cookie via NextResponse sets it with an empty value / immediate expiry.
    expect(cookie?.value ?? "").toBe("");
  });
});
