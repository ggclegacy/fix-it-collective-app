import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="section page">
      <p className="eyebrow">404</p>
      <h1>A little off course.</h1>
      <Link className="button navy" href="/">
        Back to the collective
      </Link>
    </main>
  );
}
