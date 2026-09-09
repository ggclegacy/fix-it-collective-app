import { z } from "zod";
export const providerIds = ["katie", "camilla"] as const;
export type ProviderId = (typeof providerIds)[number];
export const bodyAreas = [
  "Neck",
  "Shoulders",
  "Upper back",
  "Lower back",
  "Arms",
  "Legs",
  "Feet",
] as const;
export const recoveryGoals = [
  "Unwind",
  "After activity",
  "Everyday tension",
  "Targeted attention",
] as const;
export const profileSchema = z
  .object({
    provider: z.enum(providerIds),
    style: z.string().trim().max(160).default(""),
    fade: z
      .enum(["Discuss together", "Low", "Mid", "High", "No fade"])
      .default("Discuss together"),
    beard: z
      .enum([
        "Discuss together",
        "Clean shave",
        "Stubble",
        "Short beard",
        "Full beard",
      ])
      .default("Discuss together"),
    finish: z
      .enum(["Discuss together", "Matte", "Natural", "Shine"])
      .default("Discuss together"),
    routineMinutes: z.enum(["5", "10", "20"]).default("5"),
    notes: z.string().trim().max(1200).default(""),
    areas: z
      .array(z.enum(bodyAreas))
      .max(7)
      .refine((a) => new Set(a).size === a.length)
      .default([]),
    goal: z.enum(recoveryGoals).default("Unwind"),
    pressure: z
      .enum(["Discuss together", "Light", "Medium", "Firm"])
      .default("Discuss together"),
    quiet: z.boolean().default(false),
    consent: z.literal(true),
  })
  .strict();
export type ProviderProfile = z.infer<typeof profileSchema>;
export function emptyProfile(provider: ProviderId): ProviderProfile {
  return profileSchema.parse({ provider, consent: true });
}
export function consultationSummary(p: ProviderProfile) {
  return p.provider === "katie"
    ? [
        `Style: ${p.style || "Discuss together"}`,
        `Fade: ${p.fade}`,
        `Beard: ${p.beard}`,
        `Finish: ${p.finish}`,
        `Routine: ${p.routineMinutes} minutes`,
        p.notes,
      ]
        .filter(Boolean)
        .join("\n")
    : [
        `Goal: ${p.goal}`,
        `Areas: ${p.areas.join(", ") || "Discuss together"}`,
        `Pressure: ${p.pressure}`,
        `Quiet session: ${p.quiet ? "Preferred" : "No preference"}`,
        p.notes,
      ]
        .filter(Boolean)
        .join("\n");
}
