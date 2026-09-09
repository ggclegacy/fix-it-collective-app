import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireUser, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { endpoint, sameOrigin } from "@/lib/http";
import { canManage } from "@/lib/booking-rules";
import type { User } from "@/lib/types";
function store() {
  const d = db();
  d.exec(
    "CREATE TABLE IF NOT EXISTS reference_photos (id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES users(id),mime TEXT NOT NULL,bytes BLOB NOT NULL,created_at TEXT NOT NULL)",
  );
  return d;
}
function authorized(u: User, client: string) {
  return (
    u.id === client ||
    (canManage(u, "pro-a") &&
      Boolean(
        db()
          .prepare(
            "SELECT 1 FROM appointments WHERE client_id=? AND professional_id='pro-a'",
          )
          .get(client),
      ))
  );
}
export async function GET(request: Request) {
  const u = await currentUser();
  if (!u) return new Response("Please sign in to continue.", { status: 401 });
  const q = new URL(request.url).searchParams,
    id = q.get("id");
  if (id) {
    const r = store()
      .prepare("SELECT * FROM reference_photos WHERE id=?")
      .get(id) as
      { client_id: string; mime: string; bytes: Uint8Array } | undefined;
    if (!r || !authorized(u, r.client_id))
      return new Response("Photo not found", { status: 404 });
    return new Response(new Uint8Array(r.bytes), {
      headers: {
        "Content-Type": r.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  }
  return endpoint(() => {
    const client = q.get("client") ?? u.id;
    if (!authorized(u, client)) throw new Error("Photo access denied.");
    return {
      photos: store()
        .prepare(
          "SELECT id,created_at FROM reference_photos WHERE client_id=? ORDER BY created_at DESC",
        )
        .all(client),
    };
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const u = await requireUser();
    if (u.role !== "client")
      throw new Error("Clients upload their own reference photos.");
    const raw = await request.text();
    if (raw.length > 2900000) throw new Error("Choose a photo under 2 MB.");
    const v = z
      .object({ data: z.string().max(2800000) })
      .parse(JSON.parse(raw));
    const bytes = Buffer.from(v.data, "base64");
    if (bytes.length > 2 * 1024 * 1024)
      throw new Error("Choose a photo under 2 MB.");
    const mime = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        ? "image/jpeg"
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP"
          ? "image/webp"
          : null;
    if (!mime) throw new Error("Choose a JPEG, PNG or WebP photo.");
    if (
      (
        store()
          .prepare(
            "SELECT COUNT(*) AS n FROM reference_photos WHERE client_id=?",
          )
          .get(u.id) as { n: number }
      ).n >= 12
    )
      throw new Error("Remove an older reference before adding another.");
    const id = randomUUID();
    store()
      .prepare("INSERT INTO reference_photos VALUES(?,?,?,?,?)")
      .run(id, u.id, mime, bytes, new Date().toISOString());
    return { id };
  });
}
export async function DELETE(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const u = await requireUser(),
      v = z.object({ id: z.string().uuid() }).parse(await request.json());
    store()
      .prepare("DELETE FROM reference_photos WHERE id=? AND client_id=?")
      .run(v.id, u.id);
    return { ok: true };
  });
}
