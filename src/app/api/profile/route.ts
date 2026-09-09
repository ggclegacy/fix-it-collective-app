import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { endpoint, sameOrigin } from "@/lib/http";
import { db } from "@/lib/db";
import { professionals } from "@/lib/catalog";
export async function PATCH(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const user = await requireUser();
    const p = z
      .object({
        name: z.string().trim().min(2).max(100),
        phone: z.string().trim().max(30),
        marketing: z.boolean(),
        preferredProfessional: z.string().nullable(),
      })
      .parse(await request.json());
    if (
      p.preferredProfessional &&
      !professionals.some((x) => x.id === p.preferredProfessional)
    )
      throw new Error("Invalid professional.");
    db()
      .prepare(
        "UPDATE users SET name=?,phone=?,marketing=?,preferred_professional=? WHERE id=?",
      )
      .run(
        p.name,
        p.phone,
        Number(p.marketing),
        p.preferredProfessional,
        user.id,
      );
    return { ok: true };
  });
}
