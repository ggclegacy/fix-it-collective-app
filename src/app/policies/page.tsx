import { policy } from "@/lib/catalog";
export const metadata = { title: "Visit & policies" };
export default function Policies() {
  return (
    <main id="main" className="section page narrow">
      <p className="eyebrow">BEFORE YOUR VISIT</p>
      <h1>
        A little clarity.
        <br />A better visit.
      </h1>
      <div className="notice">
        This platform is a preview. Business details and policies require owner
        approval before live bookings open.
      </div>
      {[
        [
          "Where is the studio?",
          "The confirmed location, contact details, and directions will be published before launch. No address has been assumed.",
        ],
        [
          "When can I visit?",
          "The preview calendar uses illustrative working hours in America/Chicago. Actual opening hours are awaiting confirmation.",
        ],
        [
          "Can I change my appointment?",
          policy.text +
            " Online changes close 24 hours before the sample appointment; staff can manage exceptions.",
        ],
        [
          "Will I be charged?",
          "No. Payment processing is not connected. Displayed prices are examples, and no card details are collected.",
        ],
        [
          "How is my information used?",
          "This build stores account and appointment information locally for testing. Use sample information only. The final privacy notice, data retention rules, and communications consent must be approved before customer onboarding.",
        ],
      ].map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </main>
  );
}
