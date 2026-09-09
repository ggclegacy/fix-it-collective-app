import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BusinessNav } from "@/components/business/shell";
import { scopes } from "@/lib/business/access";
import "./business-os.css";
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
      <BusinessNav
        contexts={[
          ...(user.role === "owner"
            ? [{ value: "collective", label: "Collective" }]
            : []),
          ...scopes(user).map((id) => ({
            value: id === "pro-a" ? "katie" : "kamilla",
            label: id === "pro-a" ? "Katie" : "Kamilla",
          })),
        ]}
      />
      <main id="main" className="workspace studio-workspace os-workspace">
        {children}
      </main>
    </>
  );
}
