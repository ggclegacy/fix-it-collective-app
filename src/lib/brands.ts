// Approved names; artwork and exact sampled palette pending source attachment.
export type BrandId = "collective" | "recovery";
export const brands = {
  collective: {
    name: "Fix It Collective",
    short: "The Collective",
    href: "/services",
    discipline: "Grooming · Beauty · Community",
  },
  recovery: {
    name: "Recovery Room by Milla",
    short: "Recovery Room",
    href: "/recovery",
    discipline: "Massage · Recovery · Wellness",
  },
} as const;
export function brandForService(service?: { brand: BrandId }) {
  return brands[service?.brand ?? "collective"];
}
