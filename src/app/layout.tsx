import type { Metadata, Viewport } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "FIX IT COLLECTIVE — Grooming, Beauty & Recovery",
    template: "%s | FIX IT COLLECTIVE",
  },
  description:
    "Fix It Collective and Recovery Room by Milla. Distinct grooming, beauty and wellness experiences in one connected collective.",
  applicationName: "Fix It Collective",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  themeColor: "#122a3c",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="preview-banner">
          THE PLATFORM PREVIEW{" "}
          <span>
            Sample services, team & pricing · no live bookings or charges
          </span>
        </div>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
