import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { one } from "./db";
import type { Role, User } from "./types";

const COOKIE = "vs_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 ngày

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("Thiếu AUTH_SECRET (>= 32 ký tự)");
    return new TextEncoder().encode("dev-only-secret-dev-only-secret-dev-only");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.PUBLIC_BASE_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await one<User>(`SELECT id, email, name, phone, role, active FROM users WHERE id = $1`, [payload.uid]);
    return user && user.active ? user : null;
  } catch {
    return null;
  }
}

// Phân quyền: admin > editor > reporter
const RANK: Record<Role, number> = { reporter: 1, editor: 2, admin: 3 };
export const can = (user: User | null, min: Role) => !!user && RANK[user.role] >= RANK[min];

export async function requireUser(min: Role = "reporter"): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  if (!can(user, min)) redirect("/admin?denied=1");
  return user;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Quản trị hệ thống",
  editor: "Biên tập",
  reporter: "Ghi nhật ký",
};
