export type BusinessCredential = {
  id: string;
  category: "veteran-owned" | "women-owned" | "louisiana-veteran-business";
  label: string;
  issuer: string;
  status: "unverified" | "verified";
  verificationUrl: string;
  verifiedOn: string;
  expiresOn: string;
  mark?: { src: string; alt: string; usageApproved: boolean };
};

// Ownership is owner-provided brand information, not certification.
// Add records only after reviewing the actual credential and issuer's mark rules.
export const businessCredentials: readonly BusinessCredential[] = [];

export function isPublishableCredential(
  c: BusinessCredential,
  now = Date.now(),
) {
  const verified = Date.parse(c.verifiedOn);
  const expiry = Date.parse(c.expiresOn);
  return (
    c.status === "verified" &&
    Boolean(c.label.trim() && c.issuer.trim()) &&
    /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(c.verificationUrl) &&
    Number.isFinite(verified) &&
    verified <= now &&
    Number.isFinite(expiry) &&
    expiry > now &&
    expiry > verified
  );
}
