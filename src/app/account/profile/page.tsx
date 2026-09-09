import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
export const metadata = { title: "My profile" };
export default async function Profile() {
  return (
    <>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">THE PERSONAL DETAILS</p>
          <h1>Make yourself at home.</h1>
          <p>Your preferences make every visit a little more you.</p>
        </div>
      </div>
      <ProfileForm user={await requireUser()} />
    </>
  );
}
