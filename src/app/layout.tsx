import type { Metadata, Viewport } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "FIX IT COLLECTIVE — Made for your everyday.",
    template: "%s | FIX IT COLLECTIVE",
  },
  description:
    "A considered approach to grooming, personal care, and the way you show up.",
  applicationName: "Fix It Collective",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = {
  themeColor: "#102b46",
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
