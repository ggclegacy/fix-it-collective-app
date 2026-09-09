import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { endpoint, sameOrigin } from "@/lib/http";
import { book, changeStatus } from "@/lib/scheduling";
import { bookingSchema } from "@/lib/validation";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    sameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const raw = await request.json();
    if (raw.action === "reschedule")
      return { id: book(user, bookingSchema.parse(raw), id) };
    const input = z
      .object({
        status: z.enum([
          "requested",
          "checked_out",
          "late_cancel",
          "booked",
          "confirmed",
          "checked_in",
          "in_service",
          "cancelled",
          "completed",
          "no_show",
        ]),
      })
      .parse(raw);
    changeStatus(user, id, input.status);
    return { ok: true };
  });
}
