import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkspaceNav } from "@/components/workspace-nav";
export const dynamic = "force-dynamic";
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await currentUser())) redirect("/signin?next=/account");
  return (
    <>
      <WorkspaceNav />
      <main id="main" className="workspace">
        {children}
      </main>
    </>
  );
}
