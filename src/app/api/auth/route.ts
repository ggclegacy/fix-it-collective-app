import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  demoEnabled,
  hashPassword,
  verifyPassword,
  session,
  logout,
  throttle,
} from "@/lib/auth";
import { endpoint, sameOrigin } from "@/lib/http";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("signup"),
    name: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    password: z.string().min(12, "Use at least 12 characters.").max(128),
  }),
  z.object({
    action: z.literal("signin"),
    email: z.email().max(254),
    password: z.string().min(1).max(128),
  }),
  z.object({ action: z.literal("demo"), role: z.enum(["client", "staff"]) }),
  z.object({ action: z.literal("logout") }),
]);
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const input = schema.parse(await request.json());
    if (input.action === "logout") {
      await logout();
      return { ok: true };
    }
    if (input.action === "demo") {
      if (!demoEnabled()) throw new Error("Preview sign-in is disabled.");
      await session(`demo-${input.role}`);
      return { ok: true };
    }
    const email = input.email.toLowerCase();
    throttle(`auth:${email}`, 10);
    throttle("auth:global", 100);
    if (input.action === "signup") {
      const id = randomUUID();
      db()
        .prepare(
          "INSERT INTO users(id,name,email,password_hash) VALUES(?,?,?,?)",
        )
        .run(id, input.name, email, hashPassword(input.password));
      await session(id);
    } else {
      const user = db()
        .prepare("SELECT id,password_hash FROM users WHERE email=?")
        .get(email) as { id: string; password_hash: string } | undefined;
      const valid = verifyPassword(
        input.password,
        user?.password_hash ?? "fallback:00",
      );
      if (!user || !valid) throw new Error("Email or password is incorrect.");
      await session(user.id);
    }
    return { ok: true };
  });
}
