import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkspaceNav } from "@/components/workspace-nav";
export const dynamic = "force-dynamic";
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/signin?next=/studio");
  if (user.role === "client") redirect("/account");
  return (
    <>
      <WorkspaceNav staff />
      <main id="main" className="workspace studio-workspace">
        {children}
      </main>
    </>
  );
}
