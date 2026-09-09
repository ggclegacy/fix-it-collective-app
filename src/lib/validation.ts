import { z } from "zod";
export const bookingSchema = z.object({
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  start: z.iso.datetime(),
  addonIds: z.array(z.string()).max(5),
  acknowledged: z.literal(true, {
    error: "Please acknowledge the booking policy.",
  }),
  intake: z.string().trim().max(2000).default(""),
});
