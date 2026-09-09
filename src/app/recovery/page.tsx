import Link from "next/link";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
export const metadata = {
  title: "Recovery Room by Milla",
  description:
    "Massage, recovery, bodywork and wellness within the Fix It Collective partnership.",
};
export default function Recovery() {
  return (
    <main id="main" className="recovery-environment">
      <section className="section recovery-intro">
        <Link href="/#experiences" className="text-link">
          <ArrowLeft size={16} /> The partnership
        </Link>
        <p className="eyebrow">
          RECOVERY ROOM <span className="by-milla">by Milla</span>
        </p>
        <h1>
          Permission
          <br />
          to <em>exhale.</em>
        </h1>
        <p className="recovery-lede">
          A space for massage, recovery, bodywork and wellness.
          <br />A distinct identity. A shared commitment to personal care.
        </p>
        <div className="recovery-signature">
          MIND · BODY · BALANCE · A BETTER YOU
        </div>
      </section>
      <section className="section recovery-details">
        <div>
          <p className="eyebrow">WITHIN THE COLLECTIVE</p>
          <h2>
            Your recovery.
            <br />
            <em>Your own pace.</em>
          </h2>
        </div>
        <div>
          <p>
            Recovery Room by Milla is the wellness partner within Fix It
            Collective. Your appointments will live together, with the care and
            identity of each brand clearly recognized.
          </p>
          <div className="notice">
            <strong>The Recovery Room menu is being prepared.</strong>
            <br />
            Services, session lengths and practitioner availability are awaiting
            approval. Recovery Room appointments are not yet available to book.
          </div>
          <Link href="/services" className="text-link">
            Explore the current collective menu <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
