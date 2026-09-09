import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProfile, nextRecoverySession } from "@/lib/recovery/store";
import { RecoveryIntake } from "@/components/recovery-intake";
export const metadata = {
  title: "Prepare Your Session · Recovery Room",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Prepare() {
  const user = process.env.VERCEL ? null : await currentUser();
  if (user && user.role !== "client") redirect("/studio/clients");
  return (
    <RecoveryIntake
      initial={user ? getProfile(user) : null}
      name={user?.name ?? "Welcome"}
      appointment={user ? nextRecoverySession(user) : null}
      guest={!user}
    />
  );
}
