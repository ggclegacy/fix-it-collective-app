// Approved artwork supplied September 9, 2026. Original pixels are retained in public/brand/originals.
export type BrandId = "collective" | "recovery";
export const brands = {
  collective: {
    name: "Fix It Collective",
    asset: "fix-it-collective",
    short: "The Collective",
    href: "/services",
    discipline: "Grooming · Beauty · Community",
  },
  recovery: {
    name: "Recovery Room by Milla",
    asset: "recovery-room",
    short: "Recovery Room",
    href: "/recovery",
    discipline: "Massage · Recovery · Wellness",
  },
} as const;
export function brandForService(service?: { brand: BrandId }) {
  return brands[service?.brand ?? "collective"];
}
