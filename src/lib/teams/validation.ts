import type { TeamMoveSets } from "@/lib/db/schema";

export const TEAM_SIZE = 6;
export const MOVES_PER_CARD = 4;

export type TeamDraft = {
  name: string;
  cardIds: string[];
  moveSets: TeamMoveSets;
};

export type ValidationError = { field: string; message: string };

/**
 * Shape validation — checks the slots are filled, no duplicate cards, each
 * card has 1..4 moves, each move ID is in that card's eligible pool.
 *
 * `eligibleByCardId` maps each owned cardId to the set of move-ids this card's
 * Person can legally use (from the learnset join). Ownership check happens
 * upstream (we only get the user's cards to look up from).
 */
export function validateTeam(
  draft: TeamDraft,
  eligibleByCardId: Map<string, Set<string>>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const trimmedName = draft.name.trim();
  if (!trimmedName) {
    errors.push({ field: "name", message: "Team name cannot be empty" });
  } else if (trimmedName.length > 60) {
    errors.push({ field: "name", message: "Team name too long (max 60 chars)" });
  }

  if (draft.cardIds.length !== TEAM_SIZE) {
    errors.push({
      field: "cardIds",
      message: `Team must have exactly ${TEAM_SIZE} cards (got ${draft.cardIds.length})`,
    });
  }

  const seen = new Set<string>();
  for (const cardId of draft.cardIds) {
    if (!cardId) {
      errors.push({ field: "cardIds", message: "Empty card slot" });
      continue;
    }
    if (seen.has(cardId)) {
      errors.push({
        field: `cardIds:${cardId}`,
        message: "Duplicate card — each card slot must be unique",
      });
    }
    seen.add(cardId);
    if (!eligibleByCardId.has(cardId)) {
      errors.push({
        field: `cardIds:${cardId}`,
        message: "Card not owned by user",
      });
    }
  }

  for (const [cardId, moveIds] of Object.entries(draft.moveSets)) {
    const eligible = eligibleByCardId.get(cardId);
    if (!eligible) continue; // already flagged above
    if (moveIds.length === 0) {
      errors.push({
        field: `moves:${cardId}`,
        message: "Each card needs at least one move",
      });
    }
    if (moveIds.length > MOVES_PER_CARD) {
      errors.push({
        field: `moves:${cardId}`,
        message: `Max ${MOVES_PER_CARD} moves per card`,
      });
    }
    const moveSeen = new Set<string>();
    for (const moveId of moveIds) {
      if (moveSeen.has(moveId)) {
        errors.push({
          field: `moves:${cardId}`,
          message: "Duplicate move in set",
        });
      }
      moveSeen.add(moveId);
      if (!eligible.has(moveId)) {
        errors.push({
          field: `moves:${cardId}`,
          message: `Move "${moveId}" not in this card's learnset`,
        });
      }
    }
  }

  // Every card in the team must have a move-set entry.
  for (const cardId of seen) {
    if (!draft.moveSets[cardId]) {
      errors.push({
        field: `moves:${cardId}`,
        message: "Missing move-set for card",
      });
    }
  }

  return errors;
}
