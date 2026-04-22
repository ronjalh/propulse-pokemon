import { describe, it, expect } from "vitest";
import type { Move } from "@/lib/db/schema";
import { applyStatus, checkWinCondition, computeDamage, resolveTurn } from "./engine";
import { makeRng } from "./rng";
import type { BattleCard, BattleState, Intent } from "./types";

// ── fixtures ────────────────────────────────────────────────────────────

function mkMove(partial: Partial<Move> & { id: string }): Move {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    type: partial.type ?? "Normal",
    category: partial.category ?? "physical",
    power: partial.power ?? 80,
    accuracy: partial.accuracy ?? 100,
    pp: partial.pp ?? 16,
    priority: partial.priority ?? 0,
    effect: partial.effect ?? null,
    flavor: partial.flavor ?? "",
  };
}

function mkCard(overrides: Partial<BattleCard> & { cardId: string }): BattleCard {
  return {
    cardId: overrides.cardId,
    personName: overrides.personName ?? overrides.cardId,
    types: overrides.types ?? ["Normal"],
    level: overrides.level ?? 50,
    maxHp: overrides.maxHp ?? 200,
    currentHp: overrides.currentHp ?? 200,
    stats: overrides.stats ?? {
      hp: 200,
      attack: 100,
      defense: 100,
      spAttack: 100,
      spDefense: 100,
      speed: 100,
    },
    moves: overrides.moves ?? [{ move: mkMove({ id: "tackle" }), ppLeft: 16 }],
    status: overrides.status ?? null,
    volatile: overrides.volatile ?? { confusionTurnsLeft: 0, sleepTurnsLeft: 0 },
  };
}

function mkState(a: BattleCard, b: BattleCard, seed = 1): BattleState {
  return {
    battleId: "test",
    turn: 1,
    rngSeed: seed,
    sides: [
      { playerId: "p1", team: [a], activeIndex: 0 },
      { playerId: "p2", team: [b], activeIndex: 0 },
    ],
    winnerId: null,
  };
}

// ── computeDamage ──────────────────────────────────────────────────────

describe("computeDamage", () => {
  it("returns 0 for a status move", () => {
    const atk = mkCard({ cardId: "a" });
    const def = mkCard({ cardId: "b" });
    const rng = makeRng(1);
    const r = computeDamage(atk, def, mkMove({ id: "growl", category: "status", power: null }), rng);
    expect(r.damage).toBe(0);
  });

  it("returns 0 damage on immunity (Normal → Ghost)", () => {
    const atk = mkCard({ cardId: "a", types: ["Normal"] });
    const def = mkCard({ cardId: "b", types: ["Ghost"] });
    const rng = makeRng(1);
    const r = computeDamage(atk, def, mkMove({ id: "tackle", type: "Normal" }), rng);
    expect(r.damage).toBe(0);
    expect(r.effectiveness).toBe(0);
  });

  it("applies super-effective (Fire → Grass = 2×)", () => {
    const atk = mkCard({ cardId: "a", types: ["Fire"] });
    const def = mkCard({ cardId: "b", types: ["Grass"] });
    const rng = makeRng(1);
    const r = computeDamage(atk, def, mkMove({ id: "flamethrower", type: "Fire", category: "special" }), rng);
    expect(r.effectiveness).toBe(2);
    expect(r.damage).toBeGreaterThan(0);
  });

  it("applies not-very-effective (Fire → Water = 0.5×)", () => {
    const atk = mkCard({ cardId: "a", types: ["Fire"] });
    const def = mkCard({ cardId: "b", types: ["Water"] });
    const rng = makeRng(1);
    const r = computeDamage(atk, def, mkMove({ id: "ember", type: "Fire", category: "special" }), rng);
    expect(r.effectiveness).toBe(0.5);
  });

  it("stacks dual-type effectiveness (Ice → Grass/Dragon = 4×)", () => {
    const atk = mkCard({ cardId: "a", types: ["Ice"] });
    const def = mkCard({ cardId: "b", types: ["Grass", "Dragon"] });
    const rng = makeRng(1);
    const r = computeDamage(atk, def, mkMove({ id: "ice-beam", type: "Ice", category: "special" }), rng);
    expect(r.effectiveness).toBe(4);
  });

  it("applies STAB when attacker's type matches the move", () => {
    const atk = mkCard({ cardId: "a", types: ["Fire"] });
    const def = mkCard({ cardId: "b", types: ["Normal"] });
    const rng = makeRng(1);
    const stab = computeDamage(atk, def, mkMove({ id: "flame", type: "Fire", category: "special" }), rng);
    const rng2 = makeRng(1);
    const noStab = computeDamage(atk, def, mkMove({ id: "psybeam", type: "Psychic", category: "special" }), rng2);
    expect(stab.stab).toBe(true);
    expect(noStab.stab).toBe(false);
    expect(stab.damage).toBeGreaterThan(noStab.damage);
  });

  it("halves physical damage when attacker is burned", () => {
    const healthy = mkCard({ cardId: "a", types: ["Normal"] });
    const burned = mkCard({ cardId: "a", types: ["Normal"], status: "burn" });
    const def = mkCard({ cardId: "b", types: ["Normal"] });
    const rng1 = makeRng(1);
    const rng2 = makeRng(1);
    const ok = computeDamage(healthy, def, mkMove({ id: "slam", category: "physical" }), rng1);
    const hurt = computeDamage(burned, def, mkMove({ id: "slam", category: "physical" }), rng2);
    expect(hurt.damage).toBeLessThan(ok.damage);
  });

  it("does not halve special damage when attacker is burned", () => {
    const healthy = mkCard({ cardId: "a", types: ["Normal"] });
    const burned = mkCard({ cardId: "a", types: ["Normal"], status: "burn" });
    const def = mkCard({ cardId: "b", types: ["Normal"] });
    const rng1 = makeRng(1);
    const rng2 = makeRng(1);
    const ok = computeDamage(healthy, def, mkMove({ id: "beam", category: "special" }), rng1);
    const hurt = computeDamage(burned, def, mkMove({ id: "beam", category: "special" }), rng2);
    expect(hurt.damage).toBe(ok.damage);
  });

  it("always deals at least 1 damage on a non-immune hit", () => {
    const atk = mkCard({
      cardId: "a",
      types: ["Normal"],
      stats: { hp: 1, attack: 5, defense: 5, spAttack: 5, spDefense: 5, speed: 5 },
    });
    const def = mkCard({
      cardId: "b",
      types: ["Steel"],
      stats: { hp: 1, attack: 5, defense: 500, spAttack: 5, spDefense: 500, speed: 5 },
    });
    const rng = makeRng(1);
    const r = computeDamage(atk, def, mkMove({ id: "poke", power: 1 }), rng);
    expect(r.damage).toBeGreaterThanOrEqual(1);
  });

  it("produces deterministic damage for the same rng seed", () => {
    const atk = mkCard({ cardId: "a", types: ["Fire"] });
    const def = mkCard({ cardId: "b", types: ["Grass"] });
    const rng1 = makeRng(42);
    const rng2 = makeRng(42);
    const a = computeDamage(atk, def, mkMove({ id: "m", type: "Fire", category: "special" }), rng1);
    const b = computeDamage(atk, def, mkMove({ id: "m", type: "Fire", category: "special" }), rng2);
    expect(a.damage).toBe(b.damage);
    expect(a.crit).toBe(b.crit);
  });

  it("crits land within expected range when forced by seed", () => {
    // Brute-force scan seeds to find a deterministic crit hit, then assert crit=true.
    const atk = mkCard({ cardId: "a", types: ["Normal"] });
    const def = mkCard({ cardId: "b", types: ["Normal"] });
    let sawCrit = false;
    for (let s = 1; s < 500 && !sawCrit; s++) {
      const r = computeDamage(atk, def, mkMove({ id: "m" }), makeRng(s));
      if (r.crit) sawCrit = true;
    }
    expect(sawCrit).toBe(true);
  });
});

// ── applyStatus ────────────────────────────────────────────────────────

describe("applyStatus", () => {
  it("refuses to double-up a major status", () => {
    const c = mkCard({ cardId: "a", status: "poison" });
    const res = applyStatus(c, "burn", makeRng(1));
    expect(res.applied).toBe(false);
    expect(c.status).toBe("poison");
  });

  it("Poison/Steel types are immune to poison", () => {
    const poison = mkCard({ cardId: "a", types: ["Poison"] });
    const steel = mkCard({ cardId: "b", types: ["Steel"] });
    expect(applyStatus(poison, "poison", makeRng(1)).applied).toBe(false);
    expect(applyStatus(steel, "poison", makeRng(1)).applied).toBe(false);
  });

  it("Fire types are immune to burn", () => {
    const c = mkCard({ cardId: "a", types: ["Fire"] });
    expect(applyStatus(c, "burn", makeRng(1)).applied).toBe(false);
  });

  it("Electric types are immune to paralysis", () => {
    const c = mkCard({ cardId: "a", types: ["Electric"] });
    expect(applyStatus(c, "paralysis", makeRng(1)).applied).toBe(false);
  });

  it("Ice types are immune to freeze", () => {
    const c = mkCard({ cardId: "a", types: ["Ice"] });
    expect(applyStatus(c, "freeze", makeRng(1)).applied).toBe(false);
  });

  it("sleep sets a 1–3 turn timer", () => {
    const c = mkCard({ cardId: "a" });
    applyStatus(c, "sleep", makeRng(1));
    expect(c.status).toBe("sleep");
    expect(c.volatile.sleepTurnsLeft).toBeGreaterThanOrEqual(1);
    expect(c.volatile.sleepTurnsLeft).toBeLessThanOrEqual(3);
  });

  it("confusion is a volatile (stacks with a major status)", () => {
    const c = mkCard({ cardId: "a", status: "burn" });
    const r = applyStatus(c, "confusion", makeRng(1));
    expect(r.applied).toBe(true);
    expect(c.status).toBe("burn");
    expect(c.volatile.confusionTurnsLeft).toBeGreaterThan(0);
  });
});

// ── checkWinCondition ─────────────────────────────────────────────────

describe("checkWinCondition", () => {
  it("returns null while both sides have a living card", () => {
    const a = mkCard({ cardId: "a" });
    const b = mkCard({ cardId: "b" });
    expect(checkWinCondition(mkState(a, b))).toBeNull();
  });

  it("returns the surviving player's id when the other is fully fainted", () => {
    const a = mkCard({ cardId: "a" });
    const b = mkCard({ cardId: "b", currentHp: 0 });
    expect(checkWinCondition(mkState(a, b))).toBe("p1");
  });

  it("when both faint, attacker-side (p1) wins by convention", () => {
    const a = mkCard({ cardId: "a", currentHp: 0 });
    const b = mkCard({ cardId: "b", currentHp: 0 });
    expect(checkWinCondition(mkState(a, b))).toBe("p1");
  });
});

// ── resolveTurn: ordering ─────────────────────────────────────────────

describe("resolveTurn ordering", () => {
  it("faster attacker acts first", () => {
    const fast = mkCard({
      cardId: "fast",
      stats: { hp: 200, attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 200 },
      moves: [{ move: mkMove({ id: "quick" }), ppLeft: 10 }],
    });
    const slow = mkCard({
      cardId: "slow",
      stats: { hp: 200, attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 50 },
      moves: [{ move: mkMove({ id: "lumber" }), ppLeft: 10 }],
    });
    const state = mkState(fast, slow, 7);
    const intents: [Intent, Intent] = [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ];
    const { events } = resolveTurn(state, intents);
    const moves = events.filter((e) => e.kind === "move-used");
    expect(moves[0].actorId).toBe("fast");
  });

  it("priority beats speed", () => {
    const fast = mkCard({
      cardId: "fast",
      stats: { hp: 200, attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 200 },
      moves: [{ move: mkMove({ id: "normal" }), ppLeft: 10 }],
    });
    const slow = mkCard({
      cardId: "slow",
      stats: { hp: 200, attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 50 },
      moves: [{ move: mkMove({ id: "quick-attack", priority: 1 }), ppLeft: 10 }],
    });
    const { events } = resolveTurn(mkState(fast, slow, 9), [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ]);
    const moves = events.filter((e) => e.kind === "move-used");
    expect(moves[0].actorId).toBe("slow");
  });

  it("switches happen before any moves", () => {
    const a = mkCard({ cardId: "a1" });
    const a2 = mkCard({ cardId: "a2" });
    const b = mkCard({ cardId: "b" });
    const state: BattleState = {
      battleId: "t",
      turn: 1,
      rngSeed: 1,
      sides: [
        { playerId: "p1", team: [a, a2], activeIndex: 0 },
        { playerId: "p2", team: [b], activeIndex: 0 },
      ],
      winnerId: null,
    };
    const { events } = resolveTurn(state, [
      { kind: "move", playerId: "p2", moveIndex: 0 },
      { kind: "switch", playerId: "p1", switchTo: 1 },
    ]);
    expect(events[0].kind).toBe("switch-in");
  });

  it("paralysis halves effective speed for ordering", () => {
    const paralyzed = mkCard({
      cardId: "par",
      stats: { hp: 200, attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 180 },
      status: "paralysis",
      moves: [{ move: mkMove({ id: "m" }), ppLeft: 10 }],
    });
    const healthy = mkCard({
      cardId: "healthy",
      stats: { hp: 200, attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 100 },
      moves: [{ move: mkMove({ id: "m" }), ppLeft: 10 }],
    });
    const { events } = resolveTurn(mkState(paralyzed, healthy, 3), [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ]);
    const moves = events.filter((e) => e.kind === "move-used");
    // paralyzed speed 90 < healthy speed 100 → healthy moves first
    expect(moves[0].actorId).toBe("healthy");
  });
});

// ── resolveTurn: side effects ─────────────────────────────────────────

describe("resolveTurn effects", () => {
  it("reduces PP on use", () => {
    const a = mkCard({
      cardId: "a",
      moves: [{ move: mkMove({ id: "m", accuracy: 100 }), ppLeft: 5 }],
    });
    const b = mkCard({ cardId: "b" });
    const { newState } = resolveTurn(mkState(a, b, 1), [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ]);
    expect(newState.sides[0].team[0].moves[0].ppLeft).toBe(4);
  });

  it("ends the battle when the opponent's last card faints", () => {
    const a = mkCard({
      cardId: "strong",
      stats: { hp: 999, attack: 999, defense: 100, spAttack: 100, spDefense: 100, speed: 200 },
      moves: [{ move: mkMove({ id: "ko", power: 250 }), ppLeft: 10 }],
    });
    const b = mkCard({ cardId: "weak", currentHp: 1, maxHp: 1 });
    const { newState, events } = resolveTurn(mkState(a, b, 1), [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ]);
    expect(newState.winnerId).toBe("p1");
    expect(events.some((e) => e.kind === "battle-ended")).toBe(true);
    expect(events.some((e) => e.kind === "faint" && e.actorId === "weak")).toBe(true);
  });

  it("an immune move produces a no-effect event instead of damage", () => {
    const a = mkCard({ cardId: "ghost-hunter", types: ["Normal"] });
    const b = mkCard({ cardId: "ghost", types: ["Ghost"] });
    a.moves = [{ move: mkMove({ id: "bite", type: "Normal" }), ppLeft: 10 }];
    b.moves = [{ move: mkMove({ id: "haunt", type: "Ghost" }), ppLeft: 10 }];
    const { events, newState } = resolveTurn(mkState(a, b, 4), [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ]);
    const p1Attacks = events.filter(
      (e) => e.kind === "no-effect" && e.actorId === "ghost-hunter",
    );
    expect(p1Attacks.length).toBeGreaterThanOrEqual(1);
    // b should not have lost HP from p1's attack
    expect(newState.sides[1].team[0].currentHp).toBe(b.maxHp);
  });

  it("applies end-of-turn burn tick (1/16 maxHp)", () => {
    const a = mkCard({
      cardId: "burned",
      maxHp: 160,
      currentHp: 160,
      status: "burn",
      moves: [{ move: mkMove({ id: "m" }), ppLeft: 10 }],
    });
    const b = mkCard({
      cardId: "target",
      maxHp: 200,
      currentHp: 200,
      stats: { hp: 200, attack: 1, defense: 9999, spAttack: 1, spDefense: 9999, speed: 1 },
      moves: [{ move: mkMove({ id: "tap", power: 1 }), ppLeft: 10 }],
    });
    const { events } = resolveTurn(mkState(a, b, 1), [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ]);
    const tick = events.find((e) => e.kind === "status-tick" && e.status === "burn");
    expect(tick).toBeDefined();
    if (tick && tick.kind === "status-tick") {
      expect(tick.damage).toBe(Math.floor(a.maxHp / 16));
    }
  });

  it("applies end-of-turn poison tick (1/8 maxHp)", () => {
    const a = mkCard({
      cardId: "poisoned",
      maxHp: 160,
      currentHp: 160,
      status: "poison",
      moves: [{ move: mkMove({ id: "m" }), ppLeft: 10 }],
    });
    const b = mkCard({
      cardId: "target",
      stats: { hp: 200, attack: 1, defense: 9999, spAttack: 1, spDefense: 9999, speed: 1 },
      moves: [{ move: mkMove({ id: "tap", power: 1 }), ppLeft: 10 }],
    });
    const { events } = resolveTurn(mkState(a, b, 1), [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ]);
    const tick = events.find((e) => e.kind === "status-tick" && e.status === "poison");
    expect(tick).toBeDefined();
    if (tick && tick.kind === "status-tick") {
      expect(tick.damage).toBe(Math.floor(a.maxHp / 8));
    }
  });

  it("never mutates the input state", () => {
    const a = mkCard({ cardId: "a" });
    const b = mkCard({ cardId: "b" });
    const state = mkState(a, b, 11);
    const snapshot = JSON.stringify(state);
    resolveTurn(state, [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ]);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("status move inflicts the target with its effect slug", () => {
    const a = mkCard({ cardId: "sleeper" });
    a.moves = [
      {
        move: mkMove({
          id: "spore",
          category: "status",
          power: null,
          accuracy: 100,
          effect: "sleep",
        }),
        ppLeft: 10,
      },
    ];
    const b = mkCard({ cardId: "victim" });
    const { newState, events } = resolveTurn(mkState(a, b, 1), [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ]);
    expect(events.some((e) => e.kind === "status-inflicted" && e.status === "sleep")).toBe(true);
    expect(newState.sides[1].team[0].status).toBe("sleep");
  });

  it("re-seeds turn rng deterministically (same inputs → same outputs)", () => {
    const mk = () => {
      const a = mkCard({ cardId: "a", types: ["Fire"] });
      const b = mkCard({ cardId: "b", types: ["Grass"] });
      a.moves = [{ move: mkMove({ id: "flame", type: "Fire", category: "special" }), ppLeft: 10 }];
      b.moves = [{ move: mkMove({ id: "tackle" }), ppLeft: 10 }];
      return mkState(a, b, 1234);
    };
    const intents: [Intent, Intent] = [
      { kind: "move", playerId: "p1", moveIndex: 0 },
      { kind: "move", playerId: "p2", moveIndex: 0 },
    ];
    const r1 = resolveTurn(mk(), intents);
    const r2 = resolveTurn(mk(), intents);
    expect(JSON.stringify(r1.events)).toBe(JSON.stringify(r2.events));
    expect(r1.newState.rngSeed).toBe(r2.newState.rngSeed);
    expect(r1.newState.turn).toBe(2);
  });
});
