import { test } from "node:test";
import assert from "node:assert/strict";
import {
  profileSchema,
  emptyProfile,
  consultationSummary,
} from "../src/lib/provider-profiles";
test("preference validation rejects unconsented, invalid and oversized data", () => {
  for (const change of [
    { consent: false },
    { provider: "other" },
    { areas: ["Neck", "Neck"] },
    { areas: ["invalid"] },
    { notes: "x".repeat(1201) },
    { client_id: "someone-else" },
  ])
    assert.equal(
      profileSchema.safeParse({ ...emptyProfile("camilla"), ...change })
        .success,
      false,
    );
});
test("briefs include only the relevant provider fields", () => {
  assert.match(
    consultationSummary({ ...emptyProfile("katie"), style: "Textured crop" }),
    /Textured crop/,
  );
  assert.doesNotMatch(
    consultationSummary({
      ...emptyProfile("camilla"),
      style: "Private haircut",
      areas: ["Neck"],
      pressure: "Light",
    }),
    /Private haircut/,
  );
  assert.match(
    consultationSummary({
      ...emptyProfile("camilla"),
      areas: ["Neck"],
      pressure: "Light",
    }),
    /Areas: Neck\nPressure: Light/,
  );
});
