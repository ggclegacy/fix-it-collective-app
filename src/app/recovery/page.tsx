import Link from "next/link";
import { settings } from "@/lib/booking-rules";
import { ProviderEnvironment } from "@/components/provider-environment";
export const metadata = {
  title: "Recovery Room by Milla",
  description:
    "Enter Camilla’s recovery space. Prepare a personal session brief and explore care on your terms.",
};
export default function Recovery() {
  const b = process.env.VERCEL ? {} : settings();
  return (
    <>
      <ProviderEnvironment provider="camilla" />
      <section className="booking-page">
        <p>
          {b.therapist_license
            ? `${b.therapist_name} · Louisiana license ${b.therapist_license} · ${b.establishment_name} ${b.establishment_license}`
            : "Massage booking awaits approved license information."}
        </p>
        <Link className="button navy" href="/book?experience=camilla">
          Plan your visit with Kamilla
        </Link>
      </section>
    </>
  );
}
