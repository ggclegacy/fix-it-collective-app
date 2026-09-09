import { scopedAppointments } from "@/lib/business/intelligence";
import { requireUser } from "@/lib/auth";
import { clients } from "@/lib/staff";
import { ClientDirectory } from "@/components/client-directory";
export const metadata = { title: "Client directory" };
export default async function Clients({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>;
}) {
  const { context } = await searchParams;
  const staff = await requireUser(true);
  const ids = new Set(
    scopedAppointments(staff, context).map((a) => a.client_id),
  );
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">THE PEOPLE AT THE CENTER</p>
          <h1>Know your collective.</h1>
          <p>Visit history, preferences, and the details that matter.</p>
        </div>
      </div>
      <ClientDirectory
        clients={clients(staff).filter(
          (c) => !context || context === "collective" || ids.has(c.id),
        )}
      />
    </>
  );
}
