"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="section page">
      <p className="eyebrow">LET’S TRY THAT AGAIN</p>
      <h1>We hit a snag.</h1>
      <p>
        Your appointment may already be saved. Check your account before
        submitting another booking.
      </p>
      <button className="button navy" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
