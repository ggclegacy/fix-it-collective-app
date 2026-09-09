import { ProviderEnvironment } from "@/components/provider-environment";
export const metadata = {
  title: "Katie’s Studio — Grooming & Wellness",
  description:
    "Enter Katie’s studio. A personal grooming ritual, style profile and wellness space within Fix It Collective.",
};
export default function Grooming() {
  return <ProviderEnvironment provider="katie" />;
}
