import { ProviderEnvironment } from "@/components/provider-environment";
export const metadata = {
  title: "Recovery Room by Milla",
  description:
    "Enter Camilla’s recovery space. Prepare a personal session brief and explore care on your terms.",
};
export default function Recovery() {
  return <ProviderEnvironment provider="camilla" />;
}
