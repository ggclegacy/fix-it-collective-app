import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { sameOrigin } from "@/lib/http";
import {
  getProfile,
  saveProfile,
  saveRecoveryNote,
} from "@/lib/recovery/store";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
async function respond(fn: () => unknown | Promise<unknown>) {
  try {
    return Response.json(await fn(), { headers });
  } catch (e) {
    const raw =
      e instanceof Error ? e.message : "Unable to save. Please try again.";
    const message =
      e instanceof z.ZodError
        ? e.issues[0]?.message
        : /SQLITE|constraint|authenticate|cipher|decrypt/i.test(raw)
          ? "Unable to access your session profile. Please try again."
          : raw;
    return Response.json(
      { error: message },
      {
        status: raw.includes("sign in")
          ? 401
          : raw.includes("Staff access")
            ? 403
            : 400,
        headers,
      },
    );
  }
}
export async function GET() {
  return respond(async () => getProfile(await requireUser()));
}
export async function POST(request: Request) {
  return respond(async () => {
    sameOrigin(request);
    const user = await requireUser();
    const text = await request.text();
    if (text.length > 24000) throw new Error("Please shorten your notes.");
    const input = z
      .object({
        revision: z.number().int().min(0),
        mode: z.enum(["full", "update", "unchanged"]),
        answers: z.unknown().optional(),
      })
      .strict()
      .parse(JSON.parse(text));
    return saveProfile(user, input);
  });
}
export async function PATCH(request: Request) {
  return respond(async () => {
    sameOrigin(request);
    const user = await requireUser();
    const text = await request.text();
    if (text.length > 4000) throw new Error("Please shorten your note.");
    const input = z
      .object({
        clientId: z.string().max(100),
        body: z.string().trim().max(2000),
      })
      .strict()
      .parse(JSON.parse(text));
    saveRecoveryNote(user, input.clientId, input.body);
    return { ok: true };
  });
}
