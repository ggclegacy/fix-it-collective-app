import { z } from "zod";
export const steps = [
  "You",
  "Your Body",
  "Your Session",
  "Health",
  "Medications",
  "Review",
] as const;
export const workOptions = [
  "Mostly sitting",
  "Mostly standing",
  "Driving",
  "Physical work",
  "Mixed",
  "Prefer to discuss",
] as const;
export const goals = [
  "Release tension",
  "Relaxation",
  "Recovery",
  "Mobility",
  "Stress relief",
  "Something else",
] as const;
export const pressures = [
  "Light",
  "Medium",
  "Firm",
  "Kamilla recommends",
] as const;
export const conditions = [
  "Diabetes",
  "Blood clots / DVT",
  "Heart / circulation condition",
  "High / low blood pressure",
  "Easy bruising / bleeding",
  "Varicose veins",
  "Cancer / cancer treatment",
  "Osteoporosis",
  "Arthritis / joint condition",
  "Reduced sensation / tingling",
  "Chronic pain",
  "Neurological condition",
  "Skin condition / rash",
  "Swelling / lymphedema",
  "Recent injury / fracture",
  "Recent surgery",
  "Pregnant / possibly pregnant",
  "Fever / illness / infection",
  "Open wounds / sores",
  "Prefer to discuss privately",
  "None of these",
] as const;
export const sensations = [
  "Pain",
  "Tightness",
  "Soreness",
  "Injury",
  "Stiffness",
  "Numbness / tingling",
  "Recovery / fatigue",
  "Normal treatment",
  "Light pressure",
  "Avoid",
  "Focus",
] as const;
export const areas = [
  "Neck",
  "Left shoulder",
  "Right shoulder",
  "Chest",
  "Abdomen",
  "Left arm",
  "Right arm",
  "Left hand",
  "Right hand",
  "Upper back",
  "Lower back",
  "Left hip / glute",
  "Right hip / glute",
  "Left thigh",
  "Right thigh",
  "Left knee",
  "Right knee",
  "Left lower leg",
  "Right lower leg",
  "Left foot",
  "Right foot",
] as const;
export const answers = ["Yes", "No", "Not sure / discuss"] as const;
const short = z.string().trim().max(600);
export const intakeSchema = z
  .object({
    occupation: z.string().trim().max(100),
    work: z.enum(workOptions),
    activity: z.enum(["Low", "Moderate", "Very active", "Varies"]),
    firstMassage: z.enum(answers),
    goal: z.enum(goals),
    goalNote: short,
    pain: z.number().int().min(0).max(10),
    pressure: z.enum(pressures),
    body: z
      .array(
        z.object({
          area: z.enum(areas),
          tags: z.array(z.enum(sensations)).max(11),
          intensity: z.number().int().min(0).max(10).optional(),
        }),
      )
      .max(21),
    noProblemAreas: z.boolean().optional(),
    avoidNote: short,
    health: z.array(z.enum(conditions)).min(1).max(21),
    healthNotes: z.record(z.string().max(80), short),
    diabetes: z.object({
      insulin: z.enum(answers).or(z.literal("")),
      sensation: z.enum(answers).or(z.literal("")),
      wounds: z.enum(answers).or(z.literal("")),
    }),
    care: z.enum(answers),
    careNote: short,
    allergies: z.enum(answers),
    allergyNote: short,
    medications: z.enum(answers),
    medicationNote: short,
    bloodThinner: z.enum(answers),
    bruising: z.enum(answers),
    extra: short,
    consent: z.literal(true, {
      error: "Please confirm your consent before finishing.",
    }),
    signature: z
      .string()
      .trim()
      .min(2, "Type your full name to sign.")
      .max(100),
  })
  .superRefine((d, ctx) => {
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (d.health.includes("None of these") && d.health.length > 1)
      fail("health", "Choose health conditions or None of these.");
    if (new Set(d.body.map((x) => x.area)).size !== d.body.length)
      fail("body", "Body areas must be unique.");
    if (
      d.noProblemAreas &&
      d.body.some(
        (b) =>
          b.tags.some(
            (t) =>
              ![
                "Avoid",
                "Focus",
                "Normal treatment",
                "Light pressure",
              ].includes(t),
          ) || (b.intensity ?? 0) > 0,
      )
    )
      fail("body", "Clear reported symptoms before choosing no problem areas.");
    if (d.noProblemAreas && d.pain > 0)
      fail("pain", "Choose no problem areas or report discomfort today.");
    for (const b of d.body) {
      if (!b.tags.length && b.intensity === undefined)
        fail("body", "Add a sensation, intensity or treatment preference.");
      if (new Set(b.tags).size !== b.tags.length)
        fail("body", "Choose each sensation once.");
      if (
        b.tags.filter((t) =>
          ["Avoid", "Focus", "Normal treatment", "Light pressure"].includes(t),
        ).length > 1
      )
        fail("body", "Choose one treatment intention per area.");
    }
    if (d.allergies === "Yes" && !d.allergyNote)
      fail("allergyNote", "Add your allergies or choose Not sure / discuss.");
    if (d.medications === "Yes" && !d.medicationNote)
      fail(
        "medicationNote",
        "Add medication names or choose Not sure / discuss.",
      );
    if (
      d.health.includes("Diabetes") &&
      Object.values(d.diabetes).some((v) => !v)
    )
      fail("diabetes", "Please answer the three diabetes questions.");
  });
export type Intake = z.infer<typeof intakeSchema>;
export type Draft = Omit<
  Intake,
  | "consent"
  | "work"
  | "activity"
  | "firstMassage"
  | "goal"
  | "pressure"
  | "care"
  | "allergies"
  | "medications"
  | "bloodThinner"
  | "bruising"
> & {
  consent: boolean;
  work: Intake["work"] | "";
  activity: Intake["activity"] | "";
  firstMassage: Intake["firstMassage"] | "";
  goal: Intake["goal"] | "";
  pressure: Intake["pressure"] | "";
  care: Intake["care"] | "";
  allergies: Intake["allergies"] | "";
  medications: Intake["medications"] | "";
  bloodThinner: Intake["bloodThinner"] | "";
  bruising: Intake["bruising"] | "";
};
export const emptyIntake: Draft = {
  occupation: "",
  work: "",
  activity: "",
  firstMassage: "",
  goal: "",
  goalNote: "",
  pain: 0,
  pressure: "",
  body: [],
  avoidNote: "",
  health: [],
  healthNotes: {},
  diabetes: { insulin: "", sensation: "", wounds: "" },
  care: "",
  careNote: "",
  allergies: "",
  allergyNote: "",
  medications: "",
  medicationNote: "",
  bloodThinner: "",
  bruising: "",
  extra: "",
  consent: false,
  signature: "",
};
export const CONSENT_VERSION = "recovery-1";
export const consentText =
  "I confirm these answers are accurate to the best of my knowledge and consent to Kamilla reviewing them to prepare my massage. I consent to massage therapy after we discuss and agree on the session. Massage is not medical diagnosis or treatment. We will agree on areas, draping and pressure before starting. I may decline any area, change pressure, or stop at any time. I will tell Kamilla about changes or discomfort. My typed name is my electronic signature.";
export type Profile = {
  answers: Intake;
  revision: number;
  updatedAt: string;
  refreshedAt: string;
  signedAt: string;
  consentVersion: string;
};
export type SessionDetails = {
  id: string;
  label: string;
  date: string;
  duration: number;
} | null;
export function refreshDue(p: Profile, now = Date.now()) {
  return (
    p.consentVersion !== CONSENT_VERSION ||
    now - Date.parse(p.refreshedAt) >= 365 * 86400000
  );
}
export function focusAreas(d: Pick<Intake, "body">) {
  return d.body.filter((x) => !x.tags.includes("Avoid")).map((x) => x.area);
}
export function watchFlags(d: Intake) {
  return [
    ...d.health.filter((x) => x !== "None of these"),
    ...(d.bloodThinner !== "No" ? [`Blood thinner: ${d.bloodThinner}`] : []),
    ...(d.bruising !== "No" ? [`Bruising / bleeding: ${d.bruising}`] : []),
    ...(d.medications !== "No"
      ? [`Medications: ${d.medicationNote || "Discuss before treatment"}`]
      : []),
    ...(d.care !== "No"
      ? [`Current medical care: ${d.careNote || "Discuss"}`]
      : []),
    ...(d.health.includes("Diabetes")
      ? Object.entries(d.diabetes)
          .filter(([, v]) => v !== "No")
          .map(([k, v]) => `Diabetes · ${k}: ${v}`)
      : []),
    ...d.body
      .filter((x) => x.tags.includes("Injury"))
      .map((x) => `Injury: ${x.area}`),
    ...d.body
      .filter((x) => x.tags.includes("Numbness / tingling"))
      .map(
        (x) =>
          `Reported numbness / tingling: ${x.area} · discuss before treatment`,
      ),
  ];
}
export function normalizeIntake(d: Intake): Intake {
  return {
    ...d,
    goalNote: d.goal === "Something else" ? d.goalNote : "",
    healthNotes: Object.fromEntries(
      Object.entries(d.healthNotes).filter(([k]) =>
        d.health.includes(k as Intake["health"][number]),
      ),
    ),
    diabetes: d.health.includes("Diabetes")
      ? d.diabetes
      : { insulin: "", sensation: "", wounds: "" },
    allergyNote: d.allergies === "Yes" ? d.allergyNote : "",
    careNote: d.care === "Yes" ? d.careNote : "",
    medicationNote: d.medications === "Yes" ? d.medicationNote : "",
  };
}

export const bodyIntents = [
  "Focus",
  "Normal treatment",
  "Light pressure",
  "Avoid",
] as const;
export function describeRegion(b: Intake["body"][number]) {
  return [
    ...b.tags,
    ...(b.intensity === undefined ? [] : [`intensity ${b.intensity}/10`]),
  ].join(" · ");
}
/** Compare reports, never infer recovery or treatment effectiveness from omissions. */
export function compareBody(current: Intake["body"], previous: Intake["body"]) {
  return areas.flatMap((area) => {
    const now = current.find((b) => b.area === area),
      before = previous.find((b) => b.area === area);
    if (!now && !before) return [];
    if (!now) return [`${area}: no longer marked (not a recovery assessment)`];
    if (!before) return [`${area}: newly marked · ${describeRegion(now)}`];
    if (
      now.intensity === before.intensity &&
      [...now.tags].sort().join() === [...before.tags].sort().join()
    )
      return [];
    return [`${area}: ${describeRegion(before)} → ${describeRegion(now)}`];
  });
}
export type BodySnapshot = {
  revision: number;
  updatedAt: string;
  body: Intake["body"];
  noProblemAreas?: boolean;
};
