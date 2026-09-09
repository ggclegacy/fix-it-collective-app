// Illustrative catalog only. Replace after owner approval; never imply these are live offers.
export const studio = {
  name: "FIX IT COLLECTIVE",
  timezone: "America/Chicago",
  locationId: "studio",
  currency: "USD",
  demo: true,
} as const;
export const policy = {
  version: "preview-1",
  minimumNoticeMinutes: 120,
  horizonDays: 45,
  cancellationHours: 24,
  slotInterval: 15,
  text: "Preview policy: please reschedule or cancel at least 24 hours before your visit. No deposits or cancellation charges are collected in this preview.",
};
export type Service = {
  id: string;
  name: string;
  brand: "collective" | "recovery";
  category: string;
  description: string;
  duration: number;
  buffer: number;
  price: number;
  intervalWeeks: number;
  number: string;
};
export const services: Service[] = [
  {
    id: "signature-cut",
    name: "The signature cut",
    brand: "collective",
    category: "Hair",
    description:
      "A considered cut, shaped around your texture, routine, and personal style. Consultation, wash, cut, and finish.",
    duration: 45,
    buffer: 15,
    price: 6500,
    intervalWeeks: 4,
    number: "01",
  },
  {
    id: "cut-beard",
    name: "Cut & beard ritual",
    brand: "collective",
    category: "Grooming",
    description:
      "A complete refresh. A tailored cut paired with precise beard shaping and a considered finish.",
    duration: 75,
    buffer: 15,
    price: 9500,
    intervalWeeks: 4,
    number: "02",
  },
  {
    id: "beard",
    name: "Beard detailing",
    brand: "collective",
    category: "Grooming",
    description:
      "Refined lines, balanced shape, and thoughtful attention to the details that make it yours.",
    duration: 30,
    buffer: 15,
    price: 3500,
    intervalWeeks: 3,
    number: "03",
  },
  {
    id: "color",
    name: "Color consultation",
    brand: "collective",
    category: "Color",
    description:
      "Make a plan together. Explore your goals, upkeep, and the right approach before a color service.",
    duration: 30,
    buffer: 15,
    price: 2500,
    intervalWeeks: 8,
    number: "04",
  },
  {
    id: "massage",
    name: "Personalized massage",
    brand: "recovery",
    category: "Massage",
    description:
      "A session shaped around your objective. Duration and pricing require Kamilla’s approval.",
    duration: 60,
    buffer: 15,
    price: -1,
    intervalWeeks: 4,
    number: "05",
  },
];
export const professionals = [
  {
    id: "pro-a",
    name: "Katie",
    initials: "K",
    description: "Men’s grooming concierge",
    services: ["signature-cut", "cut-beard", "beard"],
    priceOverrides: {} as Record<string, number>,
  },
  {
    id: "pro-b",
    name: "Kamilla",
    initials: "M",
    description: "Massage & recovery",
    services: ["massage"],
    priceOverrides: { "signature-cut": 7000 } as Record<string, number>,
  },
];
export const addons = [
  {
    id: "scalp",
    name: "Scalp refresh",
    duration: 15,
    price: 1500,
    services: ["signature-cut", "cut-beard"],
  },
];
export function money(cents: number) {
  if(cents<0)return "Awaiting approval";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
export function serviceById(id: string) {
  const result = services.find((s) => s.id === id);
  if (!result) throw new Error("Choose a valid service.");
  return result;
}
export function quote(
  serviceId: string,
  professionalId: string,
  addonIds: string[] = [],
) {
  const service = serviceById(serviceId);
  const professional = professionals.find((p) => p.id === professionalId);
  if (!professional || !professional.services.includes(serviceId))
    throw new Error("This professional does not offer that service.");
  if (new Set(addonIds).size !== addonIds.length)
    throw new Error("Duplicate add-on.");
  const selected = addonIds.map((id) => {
    const a = addons.find((a) => a.id === id && a.services.includes(serviceId));
    if (!a) throw new Error("Invalid add-on.");
    return a;
  });
  return {
    duration: service.duration + selected.reduce((v, a) => v + a.duration, 0),
    buffer: service.buffer,
    price:
      (professional.priceOverrides[serviceId] ?? service.price) +
      selected.reduce((v, a) => v + a.price, 0),
  };
}
