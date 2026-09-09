import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { db } from "./db";
import type { User } from "./types";
export const demoEnabled = () => process.env.NODE_ENV === "development";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function session(userId: string) {
  const token = randomBytes(32).toString("hex");
  db()
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .run(
      tokenHash(token),
      userId,
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    );
  (await cookies()).set("fic_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get("fic_session")?.value;
  if (!token) return null;
  const user =
    (db()
      .prepare(
        "SELECT u.id,u.name,u.email,u.phone,u.role,u.marketing,u.preferred_professional FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?",
      )
      .get(tokenHash(token), new Date().toISOString()) as User | undefined) ??
    null;
  return user ? { ...user } : null;
}
export async function requireUser(staff = false) {
  const user = await currentUser();
  if (!user) throw new Error("Please sign in to continue.");
  if (staff && user.role === "client")
    throw new Error("Staff access required.");
  return user;
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("fic_session")?.value;
  if (token)
    db()
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .run(tokenHash(token));
  jar.delete("fic_session");
}
export function throttle(key: string, limit = 20) {
  const now = Date.now();
  db().prepare("DELETE FROM auth_attempts WHERE reset_at<?").run(now);
  db()
    .prepare(
      "INSERT INTO auth_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1",
    )
    .run(key, now + 15 * 60 * 1000);
  const row = db()
    .prepare("SELECT attempts FROM auth_attempts WHERE key=?")
    .get(key) as { attempts: number };
  if (row.attempts > limit)
    throw new Error("Too many attempts. Please try again in 15 minutes.");
}
