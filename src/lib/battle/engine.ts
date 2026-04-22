import type { Move } from "@/lib/db/schema";
import { typeMultiplier } from "@/lib/data/type-mapping";
import type {
  BattleCard,
  BattleEvent,
  BattleSide,
  BattleState,
  Intent,
  StatusCondition,
} from "./types";
import { makeRng, type Rng } from "./rng";

const CRIT_CHANCE = 1 / 24;

export function computeDamage(
  attacker: BattleCard,
  defender: BattleCard,
  move: Move,
  rng: Rng,
): { damage: number; crit: boolean; effectiveness: number; stab: boolean } {
  if (move.category === "status" || move.power == null) {
    return { damage: 0, crit: false, effectiveness: 1, stab: false };
  }

  const effectiveness = typeMultiplier(move.type, defender.types);
  if (effectiveness === 0) {
    return { damage: 0, crit: false, effectiveness: 0, stab: false };
  }

  const isPhysical = move.category === "physical";
  const atkStat = isPhysical ? attacker.stats.attack : attacker.stats.spAttack;
  const defStat = isPhysical ? defender.stats.defense : defender.stats.spDefense;

  const crit = rng.chance(CRIT_CHANCE);
  const stab = attacker.types.includes(move.type);
  const stabMult = stab ? 1.5 : 1;
  const critMult = crit ? 1.5 : 1;
  const burnMult =
    attacker.status === "burn" && isPhysical ? 0.5 : 1;
  // Damage random roll 0.85..1.00 in 16 steps.
  const randomMult = 0.85 + rng.nextInt(16) / 100;

  const base = Math.floor(
    Math.floor(
      (Math.floor((2 * attacker.level) / 5 + 2) * move.power * atkStat) /
        Math.max(1, defStat),
    ) / 50,
  ) + 2;

  const damage = Math.max(
    1,
    Math.floor(base * stabMult * effectiveness * critMult * burnMult * randomMult),
  );

  return { damage, crit, effectiveness, stab };
}

/** Apply a major status to a target. No-op if target already has one or is immune. */
export function applyStatus(
  target: BattleCard,
  status: StatusCondition,
  rng: Rng,
): { applied: boolean } {
  if (status === "confusion") {
    if (target.volatile.confusionTurnsLeft > 0) return { applied: false };
    target.volatile.confusionTurnsLeft = 2 + rng.nextInt(3); // 2..4
    return { applied: true };
  }

  // Type immunities for major status.
  if (status === "poison" && target.types.some((t) => t === "Poison" || t === "Steel")) {
    return { applied: false };
  }
  if (status === "burn" && target.types.includes("Fire")) {
    return { applied: false };
  }
  if (status === "paralysis" && target.types.includes("Electric")) {
    return { applied: false };
  }
  if (status === "freeze" && target.types.includes("Ice")) {
    return { applied: false };
  }

  if (target.status !== null) return { applied: false };
  target.status = status;
  if (status === "sleep") {
    target.volatile.sleepTurnsLeft = 1 + rng.nextInt(3); // 1..3
  }
  return { applied: true };
}

export function checkWinCondition(state: BattleState): string | null {
  const [a, b] = state.sides;
  const aAlive = a.team.some((c) => c.currentHp > 0);
  const bAlive = b.team.some((c) => c.currentHp > 0);
  if (!aAlive && !bAlive) return a.playerId; // tie → attacker wins by convention
  if (!aAlive) return b.playerId;
  if (!bAlive) return a.playerId;
  return null;
}

function getSide(state: BattleState, playerId: string): BattleSide {
  const s = state.sides.find((x) => x.playerId === playerId);
  if (!s) throw new Error(`no side for player ${playerId}`);
  return s;
}

function active(side: BattleSide): BattleCard {
  return side.team[side.activeIndex];
}

function orderIntents(
  state: BattleState,
  intents: [Intent, Intent],
  rng: Rng,
): [Intent, Intent] {
  const [i0, i1] = intents;
  // Switches resolve before moves.
  const i0IsSwitch = i0.kind === "switch";
  const i1IsSwitch = i1.kind === "switch";
  if (i0IsSwitch && !i1IsSwitch) return [i0, i1];
  if (i1IsSwitch && !i0IsSwitch) return [i1, i0];
  if (i0IsSwitch && i1IsSwitch) return [i0, i1];

  // Both moves — compare priority, then speed (paralysis halves), then coin flip.
  const m0 = i0 as Extract<Intent, { kind: "move" }>;
  const m1 = i1 as Extract<Intent, { kind: "move" }>;
  const c0 = active(getSide(state, m0.playerId));
  const c1 = active(getSide(state, m1.playerId));
  const pr0 = c0.moves[m0.moveIndex].move.priority;
  const pr1 = c1.moves[m1.moveIndex].move.priority;
  if (pr0 !== pr1) return pr0 > pr1 ? [i0, i1] : [i1, i0];
  const spd0 = c0.status === "paralysis" ? c0.stats.speed * 0.5 : c0.stats.speed;
  const spd1 = c1.status === "paralysis" ? c1.stats.speed * 0.5 : c1.stats.speed;
  if (spd0 !== spd1) return spd0 > spd1 ? [i0, i1] : [i1, i0];
  return rng.chance(0.5) ? [i0, i1] : [i1, i0];
}

// Check whether a card can act this turn — handles sleep/paralysis/freeze/confusion.
// Mutates volatile counters and sleep/status as appropriate.
function rollPreMove(
  actor: BattleCard,
  rng: Rng,
  events: BattleEvent[],
): { canMove: boolean; confusionHit: boolean } {
  if (actor.status === "sleep") {
    actor.volatile.sleepTurnsLeft -= 1;
    if (actor.volatile.sleepTurnsLeft <= 0) {
      actor.status = null;
    } else {
      events.push({ kind: "cant-move", actorId: actor.cardId, reason: "sleep" });
      return { canMove: false, confusionHit: false };
    }
  }
  if (actor.status === "freeze") {
    if (rng.chance(0.2)) {
      actor.status = null;
    } else {
      events.push({ kind: "cant-move", actorId: actor.cardId, reason: "freeze" });
      return { canMove: false, confusionHit: false };
    }
  }
  if (actor.status === "paralysis" && rng.chance(0.25)) {
    events.push({ kind: "cant-move", actorId: actor.cardId, reason: "paralysis" });
    return { canMove: false, confusionHit: false };
  }
  if (actor.volatile.confusionTurnsLeft > 0) {
    actor.volatile.confusionTurnsLeft -= 1;
    if (rng.chance(1 / 3)) {
      // Self-hit: 40 power typeless physical against own defense.
      const base =
        Math.floor(
          Math.floor((Math.floor((2 * actor.level) / 5 + 2) * 40 * actor.stats.attack) /
            Math.max(1, actor.stats.defense)) / 50,
        ) + 2;
      const dmg = Math.max(1, base);
      actor.currentHp = Math.max(0, actor.currentHp - dmg);
      events.push({ kind: "hurt-in-confusion", actorId: actor.cardId, damage: dmg });
      return { canMove: false, confusionHit: true };
    }
  }
  return { canMove: true, confusionHit: false };
}

function executeMoveIntent(
  state: BattleState,
  intent: Extract<Intent, { kind: "move" }>,
  rng: Rng,
  events: BattleEvent[],
): void {
  const side = getSide(state, intent.playerId);
  const other = state.sides.find((s) => s !== side)!;
  const attacker = active(side);
  const defender = active(other);
  if (attacker.currentHp <= 0) return;

  const pre = rollPreMove(attacker, rng, events);
  if (!pre.canMove) return;

  const slot = attacker.moves[intent.moveIndex];
  if (!slot || slot.ppLeft <= 0) {
    events.push({ kind: "no-effect", actorId: attacker.cardId, moveId: slot?.move.id ?? "" });
    return;
  }
  slot.ppLeft -= 1;
  const move = slot.move;

  // Accuracy check.
  if (!rng.chance(move.accuracy / 100)) {
    events.push({ kind: "miss", actorId: attacker.cardId, moveId: move.id });
    return;
  }

  if (move.category === "status") {
    const s = move.effect as StatusCondition | null;
    if (s && ["poison", "burn", "paralysis", "sleep", "freeze", "confusion"].includes(s)) {
      const { applied } = applyStatus(defender, s, rng);
      if (applied) {
        events.push({ kind: "status-inflicted", actorId: defender.cardId, status: s });
      } else {
        events.push({ kind: "no-effect", actorId: attacker.cardId, moveId: move.id });
      }
    }
    return;
  }

  const result = computeDamage(attacker, defender, move, rng);
  if (result.effectiveness === 0) {
    events.push({ kind: "no-effect", actorId: attacker.cardId, moveId: move.id });
    return;
  }
  defender.currentHp = Math.max(0, defender.currentHp - result.damage);
  events.push({
    kind: "move-used",
    actorId: attacker.cardId,
    targetId: defender.cardId,
    moveId: move.id,
    damage: result.damage,
    crit: result.crit,
    effectiveness: result.effectiveness,
    stab: result.stab,
  });

  // Secondary effect (burn_chance_30 → 30% burn, etc.).
  if (move.effect && defender.currentHp > 0) {
    const sec = parseSecondaryEffect(move.effect);
    if (sec && rng.chance(sec.chance)) {
      const { applied } = applyStatus(defender, sec.status, rng);
      if (applied) {
        events.push({ kind: "status-inflicted", actorId: defender.cardId, status: sec.status });
      }
    }
  }

  if (defender.currentHp === 0) {
    events.push({ kind: "faint", actorId: defender.cardId });
  }
}

function parseSecondaryEffect(
  slug: string,
): { status: StatusCondition; chance: number } | null {
  const m = slug.match(/^(poison|burn|paralysis|sleep|freeze|confusion)_chance_(\d+)$/);
  if (!m) return null;
  return { status: m[1] as StatusCondition, chance: Math.min(100, parseInt(m[2], 10)) / 100 };
}

function executeSwitchIntent(
  state: BattleState,
  intent: Extract<Intent, { kind: "switch" }>,
  events: BattleEvent[],
): void {
  const side = getSide(state, intent.playerId);
  if (intent.switchTo === side.activeIndex) return;
  const target = side.team[intent.switchTo];
  if (!target || target.currentHp <= 0) return;
  side.activeIndex = intent.switchTo;
  events.push({
    kind: "switch-in",
    playerId: side.playerId,
    cardId: target.cardId,
  });
}

function endOfTurnStatus(state: BattleState, events: BattleEvent[]): void {
  for (const side of state.sides) {
    const c = active(side);
    if (c.currentHp <= 0) continue;
    if (c.status === "poison") {
      const dmg = Math.max(1, Math.floor(c.maxHp / 8));
      c.currentHp = Math.max(0, c.currentHp - dmg);
      events.push({ kind: "status-tick", actorId: c.cardId, status: "poison", damage: dmg });
    } else if (c.status === "burn") {
      const dmg = Math.max(1, Math.floor(c.maxHp / 16));
      c.currentHp = Math.max(0, c.currentHp - dmg);
      events.push({ kind: "status-tick", actorId: c.cardId, status: "burn", damage: dmg });
    }
    if (c.currentHp === 0) {
      events.push({ kind: "faint", actorId: c.cardId });
    }
  }
}

export function resolveTurn(
  state: BattleState,
  intents: [Intent, Intent],
): { newState: BattleState; events: BattleEvent[] } {
  // Deep-clone via structuredClone so callers never mutate.
  const next: BattleState = structuredClone(state);
  const rng = makeRng(next.rngSeed);
  const events: BattleEvent[] = [];

  const ordered = orderIntents(next, intents, rng);
  for (const intent of ordered) {
    if (intent.kind === "switch") {
      executeSwitchIntent(next, intent, events);
    } else {
      executeMoveIntent(next, intent, rng, events);
    }
    const winner = checkWinCondition(next);
    if (winner) {
      next.winnerId = winner;
      events.push({ kind: "battle-ended", winnerId: winner });
      return { newState: next, events };
    }
  }

  endOfTurnStatus(next, events);
  const winner = checkWinCondition(next);
  if (winner) {
    next.winnerId = winner;
    events.push({ kind: "battle-ended", winnerId: winner });
  }

  next.turn += 1;
  // Re-seed for next turn (deterministic chain).
  next.rngSeed = Math.imul(next.rngSeed ^ next.turn, 0x01000193) >>> 0;

  return { newState: next, events };
}
