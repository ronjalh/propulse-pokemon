/**
 * Pure helpers for battle-card ids. Kept free of server-only imports so
 * unit tests (and any client-side code) can import them.
 */

/** Returns the underlying real (database) cardId for a battle-scoped cardId.
 *  Solo mirror matches prefix cards with `mirror-` to disambiguate; this
 *  strips the prefix. Regular UUIDs pass through. */
export function resolveRealCardId(battleCardId: string): string {
  return battleCardId.startsWith("mirror-")
    ? battleCardId.slice("mirror-".length)
    : battleCardId;
}

export function isMirrorCardId(battleCardId: string): boolean {
  return battleCardId.startsWith("mirror-");
}
