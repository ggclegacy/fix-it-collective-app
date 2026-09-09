import { test } from "node:test";
import assert from "node:assert/strict";
import { endpoint } from "../src/lib/http";

test("hosted preview refuses persistence before invoking a database operation", async () => {
  const previous = process.env.VERCEL;
  process.env.VERCEL = "1";
  let invoked = false;
  try {
    const response = await endpoint(() => {
      invoked = true;
      throw new Error("Database operation must not run");
    });
    assert.equal(response.status, 503);
    assert.equal(invoked, false);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.match((await response.json()).error, /not open yet/);
  } finally {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  }
});
