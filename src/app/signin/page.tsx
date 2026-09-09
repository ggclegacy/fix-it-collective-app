import { SigninForm } from "@/components/signin-form";
import { demoEnabled } from "@/lib/auth";
export const metadata = { title: "Your space" };
export default async function Signin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const q = await searchParams;
  const next =
    q.next?.startsWith("/") &&
    !q.next.startsWith("//") &&
    !q.next.includes("\\")
      ? q.next
      : "/account";
  return (
    <main id="main" className="section auth-page">
      <div>
        <p className="eyebrow">YOUR SPACE AT FIX IT</p>
        <h1>
          Good to
          <br />
          see <em>you.</em>
        </h1>
        <p>
          Your next visit. Your favorite people.
          <br />A little less life admin.
        </p>
        <span className="auth-monogram" aria-hidden="true">
          F / C
        </span>
      </div>
      <SigninForm next={next} demo={demoEnabled()} />
    </main>
  );
}
