import { requireUser } from "@/lib/auth";
import { clients } from "@/lib/staff";
import { ClientDirectory } from "@/components/client-directory";
export const metadata = { title: "Client directory" };
export default async function Clients() {
  await requireUser(true);
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">THE PEOPLE AT THE CENTER</p>
          <h1>Know your collective.</h1>
          <p>Visit history, preferences, and the details that matter.</p>
        </div>
      </div>
      <ClientDirectory clients={clients()} />
    </>
  );
}
