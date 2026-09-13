import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export const metadata = { title: "Legacy Sanctum — Beyond the visit" };
export default function Legacy() {
  return (
    <main id="main" className="legacy-intro section">
      <p className="eyebrow">SANCTUM COLLECTIVE / LEGACY SANCTUM</p>
      <h1>
        What begins here.
        <br />
        <em>Goes with you.</em>
      </h1>
      <p className="legacy-lede">
        A vision for living with more intention. Personal care, wellness,
        performance and community — connected to the person you’re becoming.
      </p>
      <div className="legacy-picture">
        <Image
          src="/sanctum/belong.webp"
          alt="Concept illustration of guests connecting in a warm communal space"
          fill
          sizes="100vw"
        />
      </div>
      <p className="sanctum-concept-note">
        Concept imagery · The Legacy Sanctum environment is taking shape.
      </p>
      <div className="legacy-next">
        <h2>
          Build your
          <br />
          <em>everyday ritual.</em>
        </h2>
        <div>
          <p>
            We’re bringing the next layer of Sanctum to life: the habits, care
            and connections that continue outside the building. Products and new
            experiences will be introduced here as they become available.
          </p>
          <Link href="/services" className="button gold">
            Explore current experiences <ArrowUpRight size={18} />
          </Link>
          <Link href="/#experiences" className="text-link">
            Back to the Sanctum
          </Link>
        </div>
      </div>
    </main>
  );
}
