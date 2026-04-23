import { describe, it, expect } from "vitest";

import { isMirrorCardId, resolveRealCardId } from "./card-id";

// ─────────────────────────────────────────────────────────────
// These lock down the alias behaviour that was the root cause of
// the "500 on solo 1v1" bug (mirror-prefixed cardIds were being
// fed directly into a uuid column, making Postgres reject the query).
// ─────────────────────────────────────────────────────────────

describe("resolveRealCardId", () => {
  it("returns a uuid unchanged", () => {
    const uuid = "3a5b7c9d-1e2f-4a5b-9c3d-7e8f2a1b4c5d";
    expect(resolveRealCardId(uuid)).toBe(uuid);
  });

  it("strips the mirror- prefix", () => {
    const uuid = "3a5b7c9d-1e2f-4a5b-9c3d-7e8f2a1b4c5d";
    expect(resolveRealCardId(`mirror-${uuid}`)).toBe(uuid);
  });

  it("handles empty string", () => {
    expect(resolveRealCardId("")).toBe("");
  });
});

describe("isMirrorCardId", () => {
  it("recognises a mirror id", () => {
    expect(isMirrorCardId("mirror-3a5b7c9d-1e2f-4a5b-9c3d-7e8f2a1b4c5d")).toBe(
      true,
    );
  });
  it("rejects a plain uuid", () => {
    expect(isMirrorCardId("3a5b7c9d-1e2f-4a5b-9c3d-7e8f2a1b4c5d")).toBe(false);
  });
});
