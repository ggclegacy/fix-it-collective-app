import { requireUser, throttle } from "@/lib/auth";
import { endpoint, sameOrigin } from "@/lib/http";
import { appointmentsFor, book } from "@/lib/scheduling";
import { bookingSchema } from "@/lib/validation";
export async function GET() {
  return endpoint(async () => ({
    appointments: appointmentsFor(await requireUser()),
  }));
}
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const user = await requireUser();
    throttle(`booking:${user.id}`, 30);
    const input = bookingSchema.parse(await request.json());
    return { id: book(user, input) };
  });
}
