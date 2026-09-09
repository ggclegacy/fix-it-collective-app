import { db } from "./db";
import {
  profileSchema,
  type ProviderId,
  type ProviderProfile,
} from "./provider-profiles";
function store() {
  const d = db();
  d.exec(`CREATE TABLE IF NOT EXISTS provider_profiles (
    client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK(provider IN ('katie','camilla')),
    version INTEGER NOT NULL DEFAULT 1, preferences TEXT NOT NULL, updated_at TEXT NOT NULL,
    PRIMARY KEY(client_id,provider))`);
  return d;
}
export function readProviderProfile(clientId: string, provider: ProviderId) {
  const row = store()
    .prepare(
      "SELECT preferences,updated_at FROM provider_profiles WHERE client_id=? AND provider=?",
    )
    .get(clientId, provider) as
    { preferences: string; updated_at: string } | undefined;
  return row
    ? {
        profile: profileSchema.parse(JSON.parse(row.preferences)),
        updatedAt: row.updated_at,
      }
    : null;
}
export function saveProviderProfile(
  clientId: string,
  profile: ProviderProfile,
) {
  const updatedAt = new Date().toISOString();
  store()
    .prepare(
      "INSERT INTO provider_profiles(client_id,provider,preferences,updated_at) VALUES(?,?,?,?) ON CONFLICT(client_id,provider) DO UPDATE SET preferences=excluded.preferences,updated_at=excluded.updated_at",
    )
    .run(clientId, profile.provider, JSON.stringify(profile), updatedAt);
  return { profile, updatedAt };
}
export function deleteProviderProfile(clientId: string, provider: ProviderId) {
  store()
    .prepare("DELETE FROM provider_profiles WHERE client_id=? AND provider=?")
    .run(clientId, provider);
}
