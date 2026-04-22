// Seeded PRNG so battles are replayable from (battleId, turn, rngSeed).
// mulberry32 — small, deterministic, good enough for combat rolls.
export type Rng = {
  next: () => number;
  nextInt: (maxExclusive: number) => number;
  chance: (p: number) => boolean;
};

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    nextInt: (max: number) => Math.floor(next() * max),
    chance: (p: number) => next() < p,
  };
}

// Simple string → 32-bit hash for deriving a turn seed from a battleId.
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
