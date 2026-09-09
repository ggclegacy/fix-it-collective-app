import assert from "node:assert/strict";
import test from "node:test";
import {
  matchResources,
  menNeeds,
  womenNeeds,
  resources,
} from "../src/lib/networks";

test("every need has a reviewed, actionable starting point without mock partners", () => {
  for (const [network, needs] of [
    ["men", menNeeds],
    ["women", womenNeeds],
  ] as const) {
    assert.equal(new Set(needs.map((n) => n.id)).size, needs.length);
    for (const need of needs) {
      const matches = matchResources({ network, needId: need.id });
      assert.ok(matches.length > 0, `${network}/${need.id} is a dead end`);
      assert.equal(matches.length, need.resourceIds.length);
      for (const r of matches) {
        assert.equal(r.verification.status, "public-source-reviewed");
        assert.ok(r.website.startsWith("https://"));
        assert.ok(r.verification.source.startsWith("https://"));
      }
    }
  }
  assert.equal(new Set(resources.map((r) => r.id)).size, resources.length);
});

test("known parish exclusions retain statewide safety routing", () => {
  const local = matchResources({
    network: "women",
    needId: "domestic-violence",
    parish: "Lafayette",
  });
  assert.ok(local.some((r) => r.id === "faith-house"));
  const outside = matchResources({
    network: "women",
    needId: "domestic-violence",
    parish: "Iberia",
  });
  assert.ok(!outside.some((r) => r.id === "faith-house"));
  assert.ok(outside.some((r) => r.id === "lcadv"));
  assert.deepEqual(matchResources({ network: "men", needId: "invented" }), []);
});

test("medical uncertainty never routes to a fabricated TRT partner", () => {
  assert.deepEqual(
    matchResources({ network: "men", needId: "hormones" }).map((r) => r.id),
    ["hrsa"],
  );
  assert.ok(
    menNeeds
      .find((n) => n.id === "hormones")
      ?.nextStep.includes("Symptoms alone"),
  );
});
