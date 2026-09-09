import { requireUser } from "@/lib/auth";
import { endpoint } from "@/lib/http";
import {
  intakeStatus,
  readBookingIntake,
  clientIntakeStatus,
} from "@/lib/booking-intake";
export async function GET(request: Request) {
  return endpoint(async () => {
    const u = await requireUser();
    const query = new URL(request.url).searchParams;
    const id = query.get("id");
    const client = query.get("client");
    return id
      ? { answers: readBookingIntake(u, id) }
      : client
        ? clientIntakeStatus(u, client)
        : intakeStatus(u);
  });
}
