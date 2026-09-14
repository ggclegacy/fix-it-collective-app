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
        With Neil, personal care becomes part of your everyday life. Thoughtful
        products, practical guidance and a little more intention — connected to
        the man you’re becoming.
      </p>
      <div className="legacy-picture">
        <Image
          src="/sanctum/people-v2/neil-tan-v3.webp"
          alt="AI-created scene based on Neil’s reference photos, showing personal-care product guidance with a guest"
          fill
          sizes="100vw"
        />
      </div>
      <p className="sanctum-concept-note">
        Reference-based concept imagery · Setting and packaging are
        illustrative.
      </p>
      <div className="legacy-next">
        <h2>
          Build your
          <br />
          <em>everyday ritual.</em>
        </h2>
        <div>
          <p>
            Legacy Sanctum brings Neil’s product store and personal approach to
            men’s care into the Collective. Discover how to choose and use the
            products that fit your routine, and carry that care beyond your
            visit. The product collection will appear here as it becomes
            available.
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
