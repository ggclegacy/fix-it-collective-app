import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { endpoint, sameOrigin } from "@/lib/http";
import { profileSchema, providerIds } from "@/lib/provider-profiles";
import {
  readProviderProfile,
  saveProviderProfile,
  deleteProviderProfile,
} from "@/lib/provider-store";
export async function GET(request: Request) {
  return endpoint(async () => {
    const user = await requireUser();
    const provider = z
      .enum(providerIds)
      .parse(new URL(request.url).searchParams.get("provider"));
    return { saved: readProviderProfile(user.id, provider) };
  });
}
export async function PUT(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const user = await requireUser();
    if (
      new TextEncoder().encode(await request.clone().text()).byteLength > 12000
    )
      throw new Error("Your preferences are too long.");
    const profile = profileSchema.parse(await request.json());
    return { saved: saveProviderProfile(user.id, profile) };
  });
}
export async function DELETE(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const user = await requireUser();
    const { provider } = z
      .object({ provider: z.enum(providerIds) })
      .strict()
      .parse(await request.json());
    deleteProviderProfile(user.id, provider);
    return { ok: true };
  });
}
