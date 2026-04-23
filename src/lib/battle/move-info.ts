/**
 * Human-readable description of a move's effect slug, for the move-info
 * popover. Returns a short explanation and a flag indicating whether the
 * engine actually honours the effect yet (some slugs are stored in the
 * catalog but no-op at runtime — see the `battle-engine` skill notes).
 */

const STATUS_INFLICT_TEXT: Record<string, string> = {
  poison: "Inflicts poison on the target (loses 1/8 max HP each turn).",
  burn: "Inflicts burn (loses 1/16 max HP each turn and halves physical damage dealt).",
  paralysis: "Paralyzes the target (25% chance to skip its turn, speed halved).",
  sleep: "Puts the target to sleep (skips turns for 1–3 rounds).",
  freeze: "Freezes the target (20% chance each turn to thaw).",
  confusion: "Confuses the target (1/3 chance per turn to hit itself, wears off after 2–4 turns).",
};

type Described = { text: string; implemented: boolean };

export function describeEffect(effect: string | null | undefined): Described {
  if (!effect) return { text: "No secondary effect.", implemented: true };

  // Bare status names used on status-category moves.
  if (effect in STATUS_INFLICT_TEXT) {
    return { text: STATUS_INFLICT_TEXT[effect], implemented: true };
  }

  // Secondary chance on damage moves: `<status>_chance_<N>`
  const chanceMatch = /^(poison|burn|paralysis|sleep|freeze|confusion)_chance_(\d+)$/.exec(
    effect,
  );
  if (chanceMatch) {
    const [, status, pct] = chanceMatch;
    return {
      text: `${pct}% chance on hit to also ${status === "confusion" ? "confuse" : `inflict ${status} on`} the target.`,
      implemented: true,
    };
  }

  // Everything below is currently a no-op at runtime — catalog-only.
  const notYet = (text: string): Described => ({ text, implemented: false });
  if (/^raise_atk_self(_\d)?$/.test(effect)) return notYet("Raises your Attack.");
  if (/^raise_def_self(_\d)?$/.test(effect)) return notYet("Raises your Defense.");
  if (/^raise_spatk_self(_\d)?$/.test(effect)) return notYet("Raises your Sp. Attack.");
  if (/^raise_spdef_self(_\d)?$/.test(effect)) return notYet("Raises your Sp. Defense.");
  if (/^raise_speed_self(_\d)?$/.test(effect)) return notYet("Raises your Speed.");
  if (/^raise_all_self(_\d)?$/.test(effect)) return notYet("Raises all your stats.");
  if (/^raise_atk_spatk_self/.test(effect)) return notYet("Raises your Attack and Sp. Attack.");
  if (/^lower_atk_target/.test(effect)) return notYet("Lowers the opponent's Attack.");
  if (/^lower_def_target/.test(effect)) return notYet("Lowers the opponent's Defense.");
  if (/^lower_speed_target/.test(effect)) return notYet("Lowers the opponent's Speed.");
  if (effect === "reset_opp_buffs") return notYet("Resets the opponent's stat boosts.");
  if (effect === "double_next_power") return notYet("User's next damaging move deals 2× damage.");
  if (effect === "double_if_statused") return notYet("Doubles damage if the user is statused.");
  if (effect === "force_switch") return notYet("Forces the opponent to switch out.");
  if (/^recoil_(\d+)/.test(effect)) {
    const m = /^recoil_(\d+)/.exec(effect)!;
    return notYet(`User takes ${m[1]}% of the damage dealt as recoil.`);
  }
  if (effect === "recharge") return notYet("User must recharge and can't act next turn.");
  if (effect === "heal_50") return notYet("Restores 50% of the user's max HP.");
  if (effect === "protect") return notYet("Blocks any incoming move this turn.");
  if (effect === "substitute") return notYet("Creates a decoy that absorbs the next hit.");
  if (effect === "rest") return notYet("Fully heals the user but they sleep for 2 turns.");
  if (effect === "sleep_talk") return notYet("Use a random known move — only works while asleep.");
  if (effect === "endure") return notYet("Survives any hit with at least 1 HP.");
  if (effect === "crit_rate_up") return notYet("Boosts the user's critical-hit rate.");
  if (effect === "only_while_asleep") return notYet("Can only be used while the user is asleep.");

  return notYet(`Effect slug: ${effect}`);
}
