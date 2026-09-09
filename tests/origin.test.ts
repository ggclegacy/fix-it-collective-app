import { test } from "node:test";
import assert from "node:assert/strict";
import { sameOrigin } from "../src/lib/http";
const request = (url: string, origin: string) =>
  new Request(url, { headers: { origin, "Content-Type": "application/json" } });
test("development accepts only the actual loopback origin; production requires explicit origin", () => {
  const previous = process.env;
  try {
    process.env = { ...previous, NODE_ENV: "development" };
    delete process.env.APP_ORIGIN;
    assert.doesNotThrow(() =>
      sameOrigin(
        request("http://127.0.0.1:3011/api/profile", "http://127.0.0.1:3011"),
      ),
    );
    assert.throws(() =>
      sameOrigin(
        request("http://127.0.0.1:3011/api/profile", "http://127.0.0.1:3000"),
      ),
    );
    assert.throws(() =>
      sameOrigin(
        request(
          "https://attacker.example/api/profile",
          "https://attacker.example",
        ),
      ),
    );
    process.env = { ...previous, NODE_ENV: "production" };
    delete process.env.APP_ORIGIN;
    assert.throws(() =>
      sameOrigin(
        request("http://127.0.0.1:3011/api/profile", "http://127.0.0.1:3011"),
      ),
    );
    process.env.APP_ORIGIN = "https://collective.example";
    assert.doesNotThrow(() =>
      sameOrigin(
        request(
          "https://internal.example/api/profile",
          "https://collective.example",
        ),
      ),
    );
    assert.throws(() =>
      sameOrigin(
        request(
          "https://internal.example/api/profile",
          "https://attacker.example",
        ),
      ),
    );
  } finally {
    process.env = previous;
  }
});
