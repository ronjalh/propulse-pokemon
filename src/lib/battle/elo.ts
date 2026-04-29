/**
 * Standard Elo rating system. K=32 — same as USCF for sub-master players,
 * gives meaningful but not wild swings (~16 points per even match).
 */

export const ELO_K = 32;
export const ELO_DEFAULT = 1000;

/** Expected score for `a` against `b` — between 0 and 1. */
export function expectedScore(aRating: number, bRating: number): number {
  return 1 / (1 + Math.pow(10, (bRating - aRating) / 400));
}

/** Returns the rating delta for the winner. Loser gets the negation. */
export function eloDelta(
  winnerRating: number,
  loserRating: number,
): { winner: number; loser: number } {
  const ew = expectedScore(winnerRating, loserRating);
  // Winner: actual=1, gain = K * (1 - expected)
  const winnerGain = Math.round(ELO_K * (1 - ew));
  return { winner: winnerGain, loser: -winnerGain };
}
