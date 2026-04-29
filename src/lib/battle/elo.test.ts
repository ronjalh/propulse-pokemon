import { describe, it, expect } from "vitest";

import { eloDelta, expectedScore } from "./elo";

describe("expectedScore", () => {
  it("is 0.5 for equal ratings", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 6);
  });
  it("is > 0.5 when you outrate the opponent", () => {
    expect(expectedScore(1500, 1000)).toBeGreaterThan(0.9);
  });
  it("is < 0.5 when you underrate the opponent", () => {
    expect(expectedScore(1000, 1500)).toBeLessThan(0.1);
  });
});

describe("eloDelta", () => {
  it("equal ratings → ±16 points (K=32)", () => {
    const d = eloDelta(1000, 1000);
    expect(d.winner).toBe(16);
    expect(d.loser).toBe(-16);
  });
  it("a heavy favourite gains few points for an expected win", () => {
    const d = eloDelta(1500, 1000);
    expect(d.winner).toBeLessThanOrEqual(3);
    expect(d.winner).toBeGreaterThan(0);
    expect(d.loser).toBe(-d.winner);
  });
  it("upset victories swing more", () => {
    const d = eloDelta(1000, 1500);
    expect(d.winner).toBeGreaterThanOrEqual(28);
    expect(d.loser).toBe(-d.winner);
  });
  it("delta is symmetrical", () => {
    const d = eloDelta(1234, 1100);
    expect(d.winner + d.loser).toBe(0);
  });
});
