import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Your Next Step",
  description: "Explore community resources at your own pace.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default function WomenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
