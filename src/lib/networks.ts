/** Public resource facts reviewed against official sources on 2026-09-09.
 * Public-source review is not clinical vetting, affiliation, or confirmed availability.
 * Navigator selections must stay in memory; never send them to analytics or URLs.
 */
export type Network = "men" | "women";
export type Journey = "survive" | "stabilize" | "restore" | "ascend";
export interface Need {
  id: string;
  label: string;
  group: string;
  nextStep: string;
  resourceIds: string[];
}
export interface Resource {
  id: string;
  name: string;
  description: string;
  specialties: string[];
  whoTheyHelp: string;
  location: string;
  parishes?: string[];
  coverage: "local" | "statewide" | "national";
  delivery: string;
  payment: string;
  website: string;
  phone?: string;
  phoneLabel?: string;
  verification: {
    status: "public-source-reviewed" | "partner-vetted" | "placeholder";
    source: string;
    reviewedAt: string;
    credentials: string;
  };
  actions?: { bookingUrl?: string; acceptsReferrals: boolean };
}
// Contracts only. No referral, saved-resource, or contact records are created by the public navigator.
export const referralStates = [
  "need-identified",
  "matched",
  "referral-sent",
  "accepted",
  "scheduled",
  "follow-up",
  "closed",
  "declined",
] as const;
export type SafeContact =
  | { mode: "no-contact" }
  | {
      mode: "explicit-opt-in";
      channel: "phone" | "email" | "text";
      destination: string;
      safeTimes: string;
      voicemailAllowed: boolean;
      notificationAllowed: boolean;
      consentAt: string;
    };
export interface ReferralRecord {
  id: string;
  network: Network;
  resourceId: string;
  needId: string;
  state: (typeof referralStates)[number];
  contact: SafeContact;
  consentVersion: string;
  history: { state: (typeof referralStates)[number]; at: string }[];
}
export interface SavedResource {
  resourceId: string;
  explicitConsentAt: string;
  expiresAt: string;
}
export interface NavigatorInput {
  network: Network;
  needId: string;
  parish?: string;
}
const reviewed = (
  source: string,
  credentials: string,
): Resource["verification"] => ({
  status: "public-source-reviewed",
  source,
  reviewedAt: "2026-09-09",
  credentials,
});
export const resources: Resource[] = [
  {
    id: "faith-house",
    name: "Faith House",
    description:
      "Domestic violence support, shelter, safety planning and advocacy through a Lafayette-based crisis center.",
    specialties: ["Domestic violence", "Shelter", "Advocacy"],
    whoTheyHelp:
      "Survivors of domestic violence and their children. Ask an advocate about your situation and current shelter access.",
    location: "Lafayette & seven-parish service area",
    parishes: [
      "Lafayette",
      "Vermilion",
      "Acadia",
      "St. Landry",
      "Evangeline",
      "Rapides",
      "Avoyelles",
    ],
    coverage: "local",
    delivery: "24/7 crisis phone support; local services",
    payment: "Ask the advocate about services and eligibility.",
    website: "https://faithhouseacadiana.com/",
    phone: "18884111333",
    phoneLabel: "24/7 hotline · 1-888-411-1333",
    verification: reviewed(
      "https://faithhouseacadiana.com/",
      "Official domestic violence crisis center website reviewed; no Fix It partnership implied.",
    ),
  },
  {
    id: "lcadv",
    name: "Louisiana Coalition Against Domestic Violence",
    description:
      "A statewide starting point for domestic violence support and local member programs.",
    specialties: ["Domestic violence", "Parish programs", "Safety planning"],
    whoTheyHelp:
      "People experiencing abuse and those supporting them across Louisiana.",
    location: "All Louisiana parishes",
    coverage: "statewide",
    delivery: "24/7 statewide hotline; local program routing",
    payment: "Free statewide hotline; ask local programs about services.",
    website: "https://lcadv.org/resources-and-other-publications/",
    phone: "18884111333",
    phoneLabel: "Statewide hotline · 1-888-411-1333",
    verification: reviewed(
      "https://lcadv.org/resources-and-other-publications/",
      "Official coalition source reviewed. The statewide hotline routes callers to local providers.",
    ),
  },
  {
    id: "hearts",
    name: "Hearts of Hope",
    description:
      "Sexual assault support in Acadiana, with advocacy, counseling and sexual assault nurse examiner services.",
    specialties: ["Sexual assault", "Stalking", "Counseling"],
    whoTheyHelp:
      "Children and adults affected by sexual violence. An advocate can explain support and care options.",
    location: "Acadiana",
    coverage: "local",
    delivery: "24-hour crisis phone support; local services",
    payment: "Organization describes services as available at no cost.",
    website: "https://theheartsofhope.org/",
    phone: "13372337273",
    phoneLabel: "24-hour crisis line · 337-233-7273",
    verification: reviewed(
      "https://theheartsofhope.org/",
      "Official sexual trauma center website reviewed; individual clinicians are not vetted by Fix It.",
    ),
  },
  {
    id: "lafasa",
    name: "LaFASA",
    description:
      "Statewide sexual assault support and a way to find a crisis center serving your parish.",
    specialties: [
      "Sexual assault",
      "Emotional support",
      "Local crisis centers",
    ],
    whoTheyHelp:
      "Survivors of sexual assault and their loved ones in Louisiana.",
    location: "Louisiana statewide",
    coverage: "statewide",
    delivery:
      "Phone, text and chat options on the official site; hours vary by channel",
    payment: "Helpline support is described as free.",
    website: "https://www.lafasa.org/",
    verification: reviewed(
      "https://www.lafasa.org/",
      "Official Louisiana Foundation Against Sexual Assault website reviewed.",
    ),
  },
  {
    id: "alsc",
    name: "Acadiana Legal Service Corporation",
    description:
      "Civil legal aid with an eligibility application and resources for understanding your options.",
    specialties: ["Civil legal aid", "Housing", "Family legal needs"],
    whoTheyHelp:
      "Eligible Louisiana residents within its service area. Acceptance depends on eligibility, case and capacity; representation is not guaranteed.",
    location: "Service area and intake options on official site",
    coverage: "local",
    delivery: "Online application and phone intake; check current hours",
    payment: "Legal aid eligibility assessment required.",
    website: "https://www.la-law.org/get-help/",
    phone: "18662752572",
    phoneLabel: "Intake · 1-866-275-2572",
    verification: reviewed(
      "https://www.la-law.org/get-help/",
      "Official legal aid organization website reviewed. This navigator does not give legal advice.",
    ),
  },
  {
    id: "211",
    name: "Louisiana 211",
    description:
      "Talk through what you need and find health and social services in your community.",
    specialties: ["Housing & food", "Family support", "Community resources"],
    whoTheyHelp:
      "People in all 64 Louisiana parishes, including people unsure where to start.",
    location: "All 64 Louisiana parishes",
    coverage: "statewide",
    delivery: "Phone and online resource routing",
    payment: "Ask about eligibility and costs for each referred service.",
    website: "https://www.louisiana211.org/",
    phone: "211",
    phoneLabel: "Call 211",
    verification: reviewed(
      "https://www.louisiana211.org/",
      "Official statewide information and referral network reviewed. Listings are not guaranteed openings.",
    ),
  },
  {
    id: "hrsa",
    name: "Find a Health Center",
    description:
      "Use HRSA’s locator to find a health center and ask about primary care, evaluation and referral options.",
    specialties: ["Primary care", "Preventative care", "Healthcare access"],
    whoTheyHelp:
      "People looking for a starting point for healthcare. Confirm specific services directly with the center.",
    location: "Search by city or ZIP across the U.S.",
    coverage: "national",
    delivery: "Local health centers; telehealth varies by provider",
    payment: "Ask the center about insurance, self-pay and income-based fees.",
    website: "https://findahealthcenter.hrsa.gov/",
    verification: reviewed(
      "https://findahealthcenter.hrsa.gov/",
      "U.S. Health Resources and Services Administration locator; individual provider credentials not reviewed by Fix It.",
    ),
  },
  {
    id: "treatment",
    name: "FindTreatment.gov",
    description:
      "SAMHSA’s locator for mental health and substance use treatment services.",
    specialties: ["Mental health", "Addiction & recovery"],
    whoTheyHelp:
      "People seeking treatment for themselves or someone they care about.",
    location: "U.S. locator with location filters",
    coverage: "national",
    delivery: "Provider-specific in-person and remote options",
    payment:
      "Locator includes payment filters; confirm coverage with the provider.",
    website: "https://findtreatment.gov/",
    verification: reviewed(
      "https://www.samhsa.gov/resource/dbhis/findtreatmentgov-english",
      "SAMHSA official resource reviewed. Inclusion is not a Fix It clinical endorsement.",
    ),
  },
  {
    id: "988",
    name: "988 Suicide & Crisis Lifeline",
    description:
      "Immediate emotional support for mental health, suicide or substance use crises.",
    specialties: ["Crisis support", "Mental health"],
    whoTheyHelp:
      "People in distress in the U.S. and those worried about someone else.",
    location: "United States",
    coverage: "national",
    delivery: "24/7 call, text or online chat",
    payment: "Free support.",
    website: "https://988lifeline.org/",
    phone: "988",
    phoneLabel: "Call 988",
    verification: reviewed(
      "https://988lifeline.org/",
      "Official 988 Lifeline website reviewed.",
    ),
  },
];
const need = (
  id: string,
  label: string,
  group: string,
  nextStep: string,
  resourceIds: string[],
): Need => ({ id, label, group, nextStep, resourceIds });
const clinical =
  "Start with a licensed primary care clinician. Describe what has changed and ask whether an evaluation or specialist referral fits your needs. This network cannot diagnose or recommend a treatment.";
export const menNeeds: Need[] = [
  need(
    "hormones",
    "Hormone health / TRT",
    "Body & energy",
    "Symptoms alone do not establish a hormone condition. Ask a qualified clinician about an appropriate evaluation, testing, treatment risks and fertility goals. No TRT provider has been vetted here yet.",
    ["hrsa"],
  ),
  need("energy", "Low energy", "Body & energy", clinical, ["hrsa"]),
  need("sexual-health", "Sexual health", "Body & energy", clinical, ["hrsa"]),
  need("weight", "Weight management", "Body & energy", clinical, ["hrsa"]),
  need("sleep", "Sleep", "Body & energy", clinical, ["hrsa"]),
  need(
    "mental-health",
    "Mental health",
    "Mind & connection",
    "Explore a licensed mental health provider. If you need support in a crisis now, 988 is available without using this navigator.",
    ["treatment", "988"],
  ),
  need(
    "recovery",
    "Addiction / substance recovery",
    "Mind & connection",
    "Find professional treatment and recovery support. Ask the provider about assessment, care options and payment before you commit.",
    ["treatment", "988"],
  ),
  need(
    "fatherhood",
    "Fatherhood & relationships",
    "Mind & connection",
    "Ask 211 about parenting and family support in your area, or explore professional counseling through the treatment locator.",
    ["211", "treatment"],
  ),
  need(
    "nutrition",
    "Nutrition",
    "Strength & longevity",
    "A primary care clinician can help you find appropriate nutrition support. Ask about a registered dietitian and relevant qualifications.",
    ["hrsa"],
  ),
  need(
    "fitness",
    "Fitness",
    "Strength & longevity",
    "Define your goals and ask about appropriate activity if you have health concerns. Local fitness partners are still being reviewed; 211 may help identify community options.",
    ["211", "hrsa"],
  ),
  need("pain", "Physical recovery / pain", "Strength & longevity", clinical, [
    "hrsa",
  ]),
  need(
    "prevention",
    "Preventative health / labs",
    "Strength & longevity",
    clinical,
    ["hrsa"],
  ),
  need("hair", "Hair loss", "Confidence & everyday care", clinical, ["hrsa"]),
  need(
    "grooming",
    "Skin & grooming",
    "Confidence & everyday care",
    "Explore the Collective’s grooming experiences below. For a skin or hair health concern, start with a qualified clinician; a grooming appointment is not medical care.",
    ["hrsa"],
  ),
  need("wellness", "General wellness", "Confidence & everyday care", clinical, [
    "hrsa",
    "211",
  ]),
  need(
    "unsure",
    "I just don’t feel like myself",
    "Start wherever you are",
    "You do not need to name a condition. A primary care visit can be a starting point; mental health support is also available if that feels relevant to you.",
    ["hrsa", "treatment"],
  ),
];
export const journeys: {
  id: Journey;
  label: string;
  title: string;
  description: string;
}[] = [
  {
    id: "survive",
    label: "Survive",
    title: "I need safety & support",
    description: "Abuse, assault, stalking or a safe place tonight.",
  },
  {
    id: "stabilize",
    label: "Stabilize",
    title: "I need steady ground",
    description: "Housing, food, money, legal help or caring for family.",
  },
  {
    id: "restore",
    label: "Restore",
    title: "I need room to heal",
    description: "Counseling, healthcare, recovery or rebuilding.",
  },
  {
    id: "ascend",
    label: "Ascend",
    title: "I’m ready for what’s next",
    description: "Work, learning, community and renewed confidence.",
  },
];
export const womenNeeds: Need[] = [
  need(
    "domestic-violence",
    "Domestic violence",
    "survive",
    "You do not have to decide what to do next alone. An advocate can talk through support and safety options at your pace.",
    ["faith-house", "lcadv"],
  ),
  need(
    "sexual-assault",
    "Sexual assault",
    "survive",
    "You deserve care and choices. An advocate can explain emotional support, medical care and reporting options without requiring you to tell your story here.",
    ["hearts", "lafasa"],
  ),
  need(
    "emotional-abuse",
    "Emotional / psychological abuse",
    "survive",
    "You can talk to an advocate even when there are no physical injuries or you are unsure whether to call it abuse.",
    ["faith-house", "lcadv"],
  ),
  need(
    "stalking",
    "Stalking",
    "survive",
    "An advocate can help you consider safety options, including technology concerns. Use a safer device if yours may be monitored.",
    ["hearts", "lcadv"],
  ),
  need(
    "shelter",
    "Emergency shelter",
    "survive",
    "For shelter related to domestic violence, contact an advocate. For other emergency housing, ask 211. Openings must be confirmed directly; this site cannot reserve a bed.",
    ["faith-house", "211"],
  ),
  need(
    "housing",
    "Housing instability",
    "stabilize",
    "Ask 211 about housing support in your parish. For eviction or another civil legal concern, check legal aid eligibility.",
    ["211", "alsc"],
  ),
  need(
    "single-motherhood",
    "Single motherhood",
    "stabilize",
    "Start with the part that feels most pressing. Ask 211 about family support, childcare and local assistance.",
    ["211"],
  ),
  need(
    "childcare",
    "Childcare",
    "stabilize",
    "Ask 211 about childcare options and assistance in your parish, including eligibility and availability.",
    ["211"],
  ),
  need(
    "food",
    "Food assistance",
    "stabilize",
    "Ask 211 about nearby food support and application requirements.",
    ["211"],
  ),
  need(
    "finances",
    "Financial hardship",
    "stabilize",
    "Ask 211 about assistance for the bill or expense you are facing. Programs and eligibility vary.",
    ["211"],
  ),
  need(
    "transportation",
    "Transportation",
    "stabilize",
    "Ask 211 about local transportation options and whether support is available for your destination.",
    ["211"],
  ),
  need(
    "legal",
    "Legal help",
    "stabilize",
    "Legal aid can assess eligibility and the type of civil help available. This network cannot provide legal advice or promise representation.",
    ["alsc"],
  ),
  need(
    "custody",
    "Custody / family law",
    "stabilize",
    "Ask legal aid whether your family law matter qualifies. If abuse is involved, an advocate can also help you consider support options.",
    ["alsc", "lcadv"],
  ),
  need(
    "counseling",
    "Counseling / mental health",
    "restore",
    "Explore professional care at your own pace. For immediate emotional support, call or text 988 or use its official chat.",
    ["treatment", "988"],
  ),
  need(
    "maternal",
    "Pregnancy / maternal support",
    "restore",
    "A health center can explain available care and referrals. Ask 211 about local maternal and family resources.",
    ["hrsa", "211"],
  ),
  need(
    "addiction",
    "Addiction / recovery",
    "restore",
    "Explore qualified treatment services and ask about the care, family support and payment options you need.",
    ["treatment"],
  ),
  need(
    "healthcare",
    "Healthcare",
    "restore",
    "Find a health center and ask about the care you need, insurance and self-pay options.",
    ["hrsa"],
  ),
  need(
    "rebuilding",
    "Rebuilding after abuse",
    "restore",
    "Healing does not have a deadline. An advocate can help you explore ongoing support; community resources can help with the practical pieces.",
    ["faith-house", "lcadv", "211"],
  ),
  need(
    "employment",
    "Employment",
    "ascend",
    "Ask 211 about employment services and support that fits your current circumstances.",
    ["211"],
  ),
  need(
    "education",
    "Education / job training",
    "ascend",
    "Ask 211 about local education and training resources, including costs, eligibility and childcare needs.",
    ["211"],
  ),
  need(
    "community",
    "Community & confidence",
    "ascend",
    "Ask 211 about local community programs. You can explore the Collective’s experiences whenever that feels right for you.",
    ["211"],
  ),
  need(
    "unsure",
    "I’m not sure what I need",
    "unsure",
    "You do not need to have the right words. Start with 211 for everyday support, or an advocate if something in your relationship feels unsafe.",
    ["211", "lcadv"],
  ),
];
export function matchResources(input: NavigatorInput): Resource[] {
  const selected = (input.network === "men" ? menNeeds : womenNeeds).find(
    (n) => n.id === input.needId,
  );
  if (!selected) return [];
  return selected.resourceIds.flatMap((id) => {
    const resource = resources.find((r) => r.id === id);
    if (!resource || resource.verification.status === "placeholder") return [];
    if (
      input.parish &&
      resource.parishes &&
      !resource.parishes.includes(input.parish)
    )
      return [];
    return [resource];
  });
}
