import { z } from "zod";
import { availableSlots } from "@/lib/scheduling";
import { endpoint } from "@/lib/http";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
const schema = z.object({
  service: z.string().min(1),
  professional: z.string().default("any"),
  date: z.iso.date(),
  addons: z.string().default(""),
  exclude: z.string().optional(),
});
export async function GET(request: Request) {
  return endpoint(async () => {
    const q = schema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (q.exclude) {
      const user = await currentUser();
      const a = db()
        .prepare("SELECT client_id FROM appointments WHERE id=?")
        .get(q.exclude) as { client_id: string } | undefined;
      if (!user || !a || (user.role === "client" && a.client_id !== user.id))
        throw new Error("Appointment not found.");
    }
    return {
      slots: availableSlots(
        q.service,
        q.professional,
        q.date,
        q.addons ? q.addons.split(",") : [],
        q.exclude,
      ),
    };
  });
}
