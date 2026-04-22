import type { NewMove } from "@/lib/db/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Propulse Move Catalog — DRAFT v1 (awaiting Ronja's review)
//
// Conventions
// - `power` is null for status moves.
// - `accuracy` is a % (0..100). 101 = "never miss" (bypasses the rng roll).
// - `pp` scales inversely with power: 40–60 BP ≈ 30–35 PP, 70–90 ≈ 15–20, 100+ ≈ 5–10.
// - `priority` defaults to 0. +1 = quick-attack tier.
// - `effect`: slug consumed by the engine.
//   • Status moves: one of `poison | burn | paralysis | sleep | freeze | confusion`
//     → inflicts that major/volatile status on the defender.
//   • Damage moves: `<status>_chance_<N>` → N% chance to inflict on hit.
//   • Other slugs (`raise_atk_self`, `protect`, `heal_50`, `recoil_25`, `recharge`, ...)
//     are recorded but currently no-op in the engine — reserved for future handlers.
//   • null when the move has no secondary effect.
//
// Targets: 12 moves per rocket-thematic type × 9 types = 108  +  20 universal TMs = 128.
// ─────────────────────────────────────────────────────────────────────────────

export const MOVES: NewMove[] = [
  // ── Fire (Propulsion) ────────────────────────────────────────────────────
  { id: "ignition_sequence", name: "Ignition Sequence", type: "Fire", category: "special", power: 40, accuracy: 100, pp: 35, priority: 0, effect: null, flavor: "Igniter fires and lights the chamber." },
  { id: "throttle_up", name: "Throttle Up", type: "Fire", category: "physical", power: 55, accuracy: 100, pp: 30, priority: 0, effect: null, flavor: "Ramp to full thrust." },
  { id: "hot_fire_test", name: "Hot Fire Test", type: "Fire", category: "special", power: 90, accuracy: 85, pp: 10, priority: 0, effect: "burn_chance_30", flavor: "A full-duration static firing that may singe the target." },
  { id: "combustion_chamber", name: "Combustion Chamber", type: "Fire", category: "special", power: 80, accuracy: 100, pp: 15, priority: 0, effect: null, flavor: "Contained combustion unleashed through the throat." },
  { id: "afterburn", name: "Afterburn", type: "Fire", category: "special", power: 110, accuracy: 85, pp: 5, priority: 0, effect: "burn_chance_10", flavor: "Excess propellant lights in the plume." },
  { id: "feed_line_pressure", name: "Feed Line Pressure", type: "Fire", category: "physical", power: 65, accuracy: 100, pp: 20, priority: 0, effect: null, flavor: "High-pressure slug of kerosene." },
  { id: "thrust_vectoring", name: "Thrust Vectoring", type: "Fire", category: "physical", power: 75, accuracy: 95, pp: 15, priority: 0, effect: null, flavor: "Gimbals the nozzle directly at the target." },
  { id: "oxidizer_spike", name: "Oxidizer Spike", type: "Fire", category: "special", power: 65, accuracy: 100, pp: 20, priority: 0, effect: "burn_chance_30", flavor: "Sudden LOX injection — the mixture runs hot." },
  { id: "pressure_relief", name: "Pressure Relief", type: "Fire", category: "status", power: null, accuracy: 101, pp: 15, priority: 0, effect: "reset_opp_buffs", flavor: "Venting bleeds the target's build-up." },
  { id: "static_fire", name: "Static Fire", type: "Fire", category: "special", power: 120, accuracy: 70, pp: 5, priority: 0, effect: null, flavor: "High-risk full-power burn on the pad." },
  { id: "engine_bell", name: "Engine Bell", type: "Fire", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, flavor: "A swift whip of the nozzle skirt." },
  { id: "blue_flame", name: "Blue Flame", type: "Fire", category: "special", power: 95, accuracy: 100, pp: 10, priority: 0, effect: "burn_chance_10", flavor: "Stoichiometric perfection. Rare. Deadly." },

  // ── Steel (Mechanical) ───────────────────────────────────────────────────
  { id: "inconel_plating", name: "Inconel Plating", type: "Steel", category: "status", power: null, accuracy: 101, pp: 20, priority: 0, effect: "raise_def_self_2", flavor: "Bolts on a superalloy skin." },
  { id: "tarva_takeoff", name: "Tarva Takeoff", type: "Steel", category: "physical", power: 90, accuracy: 100, pp: 10, priority: 0, effect: null, flavor: "Ascent from the Andøya range — unstoppable." },
  { id: "bulkhead_smash", name: "Bulkhead Smash", type: "Steel", category: "physical", power: 75, accuracy: 90, pp: 15, priority: 0, effect: "lower_def_target", flavor: "Impacts the target's structural frame." },
  { id: "rivet_burst", name: "Rivet Burst", type: "Steel", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, flavor: "A shotgun of steel fasteners." },
  { id: "composite_shear", name: "Composite Shear", type: "Steel", category: "physical", power: 95, accuracy: 85, pp: 10, priority: 0, effect: null, flavor: "Snaps carbon fibre along the weakest ply." },
  { id: "launch_rail", name: "Launch Rail", type: "Steel", category: "physical", power: 85, accuracy: 90, pp: 15, priority: 0, effect: null, flavor: "Guides the target down a one-way path." },
  { id: "torque_wrench", name: "Torque Wrench", type: "Steel", category: "physical", power: 70, accuracy: 100, pp: 20, priority: 0, effect: "paralysis_chance_30", flavor: "Over-torqued — the target seizes up." },
  { id: "fatigue_cycle", name: "Fatigue Cycle", type: "Steel", category: "special", power: 80, accuracy: 100, pp: 15, priority: 0, effect: null, flavor: "Cyclic loading until micro-cracks propagate." },
  { id: "heat_shield", name: "Heat Shield", type: "Steel", category: "status", power: null, accuracy: 101, pp: 20, priority: 0, effect: "raise_spdef_self_2", flavor: "Ablative layer braced for reentry." },
  { id: "structural_integrity", name: "Structural Integrity", type: "Steel", category: "status", power: null, accuracy: 101, pp: 10, priority: 0, effect: "heal_50", flavor: "Patches the frame back up." },
  { id: "payload_release", name: "Payload Release", type: "Steel", category: "physical", power: 120, accuracy: 90, pp: 5, priority: 0, effect: "recoil_33", flavor: "A savage ejection — the rocket feels it too." },
  { id: "gyroscope", name: "Gyroscope", type: "Steel", category: "status", power: null, accuracy: 101, pp: 20, priority: 0, effect: "raise_speed_self_2", flavor: "Spin-stabilised. Unshakeable." },

  // ── Dark (IT) ────────────────────────────────────────────────────────────
  { id: "pair_programming", name: "Pair Programming", type: "Dark", category: "status", power: null, accuracy: 101, pp: 20, priority: 0, effect: "double_next_power", flavor: "Two heads, one commit — next move hits hard." },
  { id: "legacy_codebase", name: "Legacy Codebase", type: "Dark", category: "physical", power: 70, accuracy: 90, pp: 20, priority: 0, effect: null, flavor: "Untouched since 2009. Still in prod. Still dangerous." },
  { id: "git_blame", name: "Git Blame", type: "Dark", category: "status", power: null, accuracy: 100, pp: 20, priority: 0, effect: "confusion", flavor: "Points the finger — the target second-guesses itself." },
  { id: "merge_conflict", name: "Merge Conflict", type: "Dark", category: "special", power: 85, accuracy: 100, pp: 15, priority: 0, effect: "confusion_chance_20", flavor: "HEAD vs. main — chaos ensues." },
  { id: "production_hotfix", name: "Production Hotfix", type: "Dark", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, flavor: "Pushed at 02:00. No review." },
  { id: "network_partition", name: "Network Partition", type: "Dark", category: "status", power: null, accuracy: 100, pp: 10, priority: 0, effect: "force_switch", flavor: "Splits the cluster — target retreats." },
  { id: "race_condition", name: "Race Condition", type: "Dark", category: "special", power: 90, accuracy: 75, pp: 10, priority: 0, effect: "paralysis_chance_30", flavor: "Non-deterministic, sometimes devastating." },
  { id: "rogue_deploy", name: "Rogue Deploy", type: "Dark", category: "physical", power: 120, accuracy: 80, pp: 5, priority: 0, effect: null, flavor: "Straight to prod on a Friday afternoon." },
  { id: "kernel_panic", name: "Kernel Panic", type: "Dark", category: "special", power: 110, accuracy: 80, pp: 5, priority: 0, effect: "paralysis_chance_10", flavor: "The whole stack seizes." },
  { id: "dependency_hell", name: "Dependency Hell", type: "Dark", category: "status", power: null, accuracy: 100, pp: 20, priority: 0, effect: "lower_speed_target", flavor: "npm install — the target stops moving." },
  { id: "firewall", name: "Firewall", type: "Dark", category: "status", power: null, accuracy: 101, pp: 20, priority: 0, effect: "raise_def_self_2", flavor: "Hardens the perimeter." },
  { id: "ssh_tunnel", name: "SSH Tunnel", type: "Dark", category: "physical", power: 95, accuracy: 100, pp: 10, priority: 0, effect: null, flavor: "Bypasses the perimeter and strikes from within." },

  // ── Ghost (Software) ─────────────────────────────────────────────────────
  { id: "null_pointer", name: "Null Pointer", type: "Ghost", category: "special", power: 65, accuracy: 100, pp: 25, priority: 0, effect: null, flavor: "Dereference. Crash. Repeat." },
  { id: "phantom_thread", name: "Phantom Thread", type: "Ghost", category: "special", power: 85, accuracy: 100, pp: 15, priority: 0, effect: null, flavor: "A worker that never joined — it's still running somewhere." },
  { id: "telemetry_void", name: "Telemetry Void", type: "Ghost", category: "special", power: 80, accuracy: 100, pp: 15, priority: 0, effect: null, flavor: "All signals lost. Silence. Then impact." },
  { id: "segfault", name: "Segfault", type: "Ghost", category: "special", power: 100, accuracy: 75, pp: 10, priority: 0, effect: "confusion_chance_20", flavor: "Core dumped on the target." },
  { id: "stack_overflow", name: "Stack Overflow", type: "Ghost", category: "special", power: 130, accuracy: 90, pp: 5, priority: 0, effect: null, flavor: "Infinite recursion at terminal velocity." },
  { id: "debugger_attach", name: "Debugger Attach", type: "Ghost", category: "status", power: null, accuracy: 100, pp: 15, priority: 0, effect: "paralysis", flavor: "Freezes the target's main loop for inspection." },
  { id: "async_await", name: "Async Await", type: "Ghost", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, flavor: "Resolves before the target can react." },
  { id: "memory_leak", name: "Memory Leak", type: "Ghost", category: "status", power: null, accuracy: 90, pp: 20, priority: 0, effect: "poison", flavor: "Slow, steady, fatal." },
  { id: "ghost_in_the_shell", name: "Ghost in the Shell", type: "Ghost", category: "physical", power: 70, accuracy: 100, pp: 20, priority: 0, effect: null, flavor: "Possesses the target's init scripts." },
  { id: "shadow_realm", name: "Shadow Realm", type: "Ghost", category: "status", power: null, accuracy: 70, pp: 10, priority: 0, effect: "sleep", flavor: "Banishes the target to staging." },
  { id: "deprecated", name: "Deprecated", type: "Ghost", category: "status", power: null, accuracy: 100, pp: 20, priority: 0, effect: "lower_atk_target", flavor: "Marked @Deprecated — the target loses confidence." },
  { id: "rubber_duck", name: "Rubber Duck", type: "Ghost", category: "physical", power: 50, accuracy: 100, pp: 25, priority: 0, effect: null, flavor: "The duck has seen too much." },

  // ── Fairy (Marketing) ────────────────────────────────────────────────────
  { id: "linkedin_post", name: "LinkedIn Post", type: "Fairy", category: "special", power: 60, accuracy: 100, pp: 25, priority: 0, effect: null, flavor: "Humbled. Excited. 400 likes." },
  { id: "sponsor_pitch", name: "Sponsor Pitch", type: "Fairy", category: "status", power: null, accuracy: 101, pp: 20, priority: 0, effect: "raise_atk_self", flavor: "Rehearsed. Charming. Closes the deal." },
  { id: "press_release", name: "Press Release", type: "Fairy", category: "special", power: 80, accuracy: 100, pp: 15, priority: 0, effect: null, flavor: "Embargoed until 09:00." },
  { id: "viral_moment", name: "Viral Moment", type: "Fairy", category: "special", power: 90, accuracy: 90, pp: 10, priority: 0, effect: "confusion_chance_20", flavor: "Unplanned. Unstoppable. Algorithm-blessed." },
  { id: "brand_aura", name: "Brand Aura", type: "Fairy", category: "status", power: null, accuracy: 101, pp: 10, priority: 0, effect: "heal_50", flavor: "A halo of goodwill restores composure." },
  { id: "instagram_story", name: "Instagram Story", type: "Fairy", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, flavor: "Gone in 24 hours but leaves a mark." },
  { id: "sponsorship_deal", name: "Sponsorship Deal", type: "Fairy", category: "status", power: null, accuracy: 101, pp: 15, priority: 0, effect: "raise_spatk_self_2", flavor: "Signed. Stamped. SpAtk +2." },
  { id: "public_outrage", name: "Public Outrage", type: "Fairy", category: "special", power: 120, accuracy: 85, pp: 5, priority: 0, effect: null, flavor: "Top of /r/all, and it's about the target." },
  { id: "testimonial", name: "Testimonial", type: "Fairy", category: "status", power: null, accuracy: 101, pp: 10, priority: 0, effect: "heal_50", flavor: "'I just love working with them.' (Case study, p.7.)" },
  { id: "glossy_brochure", name: "Glossy Brochure", type: "Fairy", category: "status", power: null, accuracy: 100, pp: 20, priority: 0, effect: "lower_atk_target", flavor: "Too much gloss — the target is distracted." },
  { id: "pink_rocket", name: "Pink Rocket", type: "Fairy", category: "special", power: 95, accuracy: 100, pp: 10, priority: 0, effect: null, flavor: "Aerodynamically questionable. Aesthetically perfect." },
  { id: "hearts_and_minds", name: "Hearts and Minds", type: "Fairy", category: "status", power: null, accuracy: 100, pp: 15, priority: 0, effect: "confusion", flavor: "The target forgets whose side it's on." },

  // ── Psychic (Board) ──────────────────────────────────────────────────────
  { id: "strategic_pivot", name: "Strategic Pivot", type: "Psychic", category: "status", power: null, accuracy: 100, pp: 15, priority: 0, effect: "force_switch", flavor: "New direction, effective immediately." },
  { id: "board_meeting", name: "Board Meeting", type: "Psychic", category: "status", power: null, accuracy: 60, pp: 10, priority: 0, effect: "sleep", flavor: "The slides were 47 pages long." },
  { id: "annual_report", name: "Annual Report", type: "Psychic", category: "special", power: 85, accuracy: 100, pp: 15, priority: 0, effect: null, flavor: "An overwhelming barrage of charts." },
  { id: "quarterly_review", name: "Quarterly Review", type: "Psychic", category: "physical", power: 70, accuracy: 100, pp: 20, priority: 0, effect: null, flavor: "Stern. Uncomfortable. Strangely painful." },
  { id: "vision_statement", name: "Vision Statement", type: "Psychic", category: "special", power: 100, accuracy: 90, pp: 10, priority: 0, effect: null, flavor: "Bold. Slightly meaningless. Extremely powerful." },
  { id: "stakeholder_alignment", name: "Stakeholder Alignment", type: "Psychic", category: "status", power: null, accuracy: 101, pp: 15, priority: 0, effect: "raise_all_self_1", flavor: "Everyone on the same page — for once." },
  { id: "executive_decision", name: "Executive Decision", type: "Psychic", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, flavor: "No vote needed. It's decided." },
  { id: "thought_leadership", name: "Thought Leadership", type: "Psychic", category: "special", power: 90, accuracy: 90, pp: 10, priority: 0, effect: "confusion_chance_20", flavor: "A LinkedIn essay that rewrites reality." },
  { id: "compliance_audit", name: "Compliance Audit", type: "Psychic", category: "status", power: null, accuracy: 90, pp: 10, priority: 0, effect: "paralysis", flavor: "The paperwork freezes the target in place." },
  { id: "strategic_partnership", name: "Strategic Partnership", type: "Psychic", category: "status", power: null, accuracy: 101, pp: 10, priority: 0, effect: "heal_50", flavor: "Mutually beneficial. Synergistic. Healing." },
  { id: "bold_initiative", name: "Bold Initiative", type: "Psychic", category: "special", power: 120, accuracy: 80, pp: 5, priority: 0, effect: null, flavor: "High-risk. High-reward. Board-approved." },
  { id: "mission_critical", name: "Mission Critical", type: "Psychic", category: "physical", power: 110, accuracy: 85, pp: 5, priority: 0, effect: null, flavor: "If this fails, everything fails." },

  // ── Normal (Business) ────────────────────────────────────────────────────
  { id: "budget_approval", name: "Budget Approval", type: "Normal", category: "status", power: null, accuracy: 101, pp: 15, priority: 0, effect: "raise_spatk_self", flavor: "The ask was reasonable. The answer was yes." },
  { id: "expense_report", name: "Expense Report", type: "Normal", category: "physical", power: 65, accuracy: 100, pp: 25, priority: 0, effect: null, flavor: "Receipts, line by line, relentless." },
  { id: "invoice_incoming", name: "Invoice Incoming", type: "Normal", category: "physical", power: 80, accuracy: 100, pp: 15, priority: 0, effect: null, flavor: "NET-30. Unforgiving." },
  { id: "cost_analysis", name: "Cost Analysis", type: "Normal", category: "special", power: 75, accuracy: 100, pp: 20, priority: 0, effect: null, flavor: "Per-kilogram-to-orbit, broken out by line item." },
  { id: "cashflow", name: "Cashflow", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, flavor: "Fast in, fast out." },
  { id: "contract_negotiation", name: "Contract Negotiation", type: "Normal", category: "status", power: null, accuracy: 70, pp: 10, priority: 0, effect: "sleep", flavor: "Clause by clause by clause by clause." },
  { id: "annual_revenue", name: "Annual Revenue", type: "Normal", category: "physical", power: 100, accuracy: 85, pp: 10, priority: 0, effect: null, flavor: "Everything, delivered all at once." },
  { id: "profit_margin", name: "Profit Margin", type: "Normal", category: "special", power: 95, accuracy: 100, pp: 10, priority: 0, effect: null, flavor: "Razor-thin but extremely sharp." },
  { id: "logistics_chain", name: "Logistics Chain", type: "Normal", category: "physical", power: 70, accuracy: 100, pp: 20, priority: 0, effect: null, flavor: "Every link hits, in sequence." },
  { id: "procurement", name: "Procurement", type: "Normal", category: "status", power: null, accuracy: 101, pp: 10, priority: 0, effect: "raise_all_self_1", flavor: "Everything sourced. All systems up." },
  { id: "headcount_crunch", name: "Headcount Crunch", type: "Normal", category: "physical", power: 120, accuracy: 85, pp: 5, priority: 0, effect: null, flavor: "Restructured. Reorganised. Refactored." },
  { id: "business_as_usual", name: "Business as Usual", type: "Normal", category: "physical", power: 50, accuracy: 100, pp: 30, priority: 0, effect: null, flavor: "Nothing special. Just the daily grind." },

  // ── Electric (Electrical) ────────────────────────────────────────────────
  { id: "voltage_spike", name: "Voltage Spike", type: "Electric", category: "special", power: 60, accuracy: 100, pp: 25, priority: 0, effect: "paralysis_chance_20", flavor: "Transient over-voltage — the target's logic freezes." },
  { id: "short_circuit", name: "Short Circuit", type: "Electric", category: "physical", power: 45, accuracy: 100, pp: 30, priority: 0, effect: null, flavor: "Live wire meets bare hull." },
  { id: "thunderstruck", name: "Thunderstruck", type: "Electric", category: "special", power: 90, accuracy: 100, pp: 15, priority: 0, effect: "paralysis_chance_30", flavor: "Direct strike on the avionics bay." },
  { id: "pcb_trace", name: "PCB Trace", type: "Electric", category: "physical", power: 60, accuracy: 100, pp: 25, priority: 0, effect: null, flavor: "A precision line etched into the target." },
  { id: "overcurrent", name: "Overcurrent", type: "Electric", category: "special", power: 110, accuracy: 85, pp: 5, priority: 0, effect: null, flavor: "Breakers fail. Insulation melts. Problem solved." },
  { id: "solder_joint", name: "Solder Joint", type: "Electric", category: "physical", power: 70, accuracy: 100, pp: 20, priority: 0, effect: null, flavor: "Molten tin at the point of impact." },
  { id: "ground_loop", name: "Ground Loop", type: "Electric", category: "status", power: null, accuracy: 100, pp: 15, priority: 0, effect: "paralysis", flavor: "An unwanted return path — target seizes." },
  { id: "capacitor_discharge", name: "Capacitor Discharge", type: "Electric", category: "special", power: 95, accuracy: 100, pp: 10, priority: 0, effect: null, flavor: "Stored charge released in a millisecond." },
  { id: "relay_switch", name: "Relay Switch", type: "Electric", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, flavor: "Click. Hit. Done." },
  { id: "harness_weave", name: "Harness Weave", type: "Electric", category: "physical", power: 75, accuracy: 95, pp: 15, priority: 0, effect: null, flavor: "Cable loom strikes like a whip." },
  { id: "voltage_regulator", name: "Voltage Regulator", type: "Electric", category: "status", power: null, accuracy: 101, pp: 20, priority: 0, effect: "raise_spdef_self_2", flavor: "Smooth rails. Nothing gets through." },
  { id: "static_shock", name: "Static Shock", type: "Electric", category: "special", power: 40, accuracy: 100, pp: 30, priority: 1, effect: "paralysis_chance_10", flavor: "A carpet-shuffle for rocket engineers." },

  // ── Dragon (Mentors) — legendary tier ────────────────────────────────────
  { id: "wisdom_of_the_ancients", name: "Wisdom of the Ancients", type: "Dragon", category: "special", power: 100, accuracy: 100, pp: 10, priority: 0, effect: null, flavor: "Knowledge accumulated across generations of launches." },
  { id: "alumni_aura", name: "Alumni Aura", type: "Dragon", category: "status", power: null, accuracy: 101, pp: 10, priority: 0, effect: "heal_50", flavor: "The presence of a veteran steadies the whole team." },
  { id: "tenure_strike", name: "Tenure Strike", type: "Dragon", category: "physical", power: 120, accuracy: 80, pp: 5, priority: 0, effect: null, flavor: "Years of experience, concentrated into one blow." },
  { id: "veteran_intuition", name: "Veteran Intuition", type: "Dragon", category: "status", power: null, accuracy: 101, pp: 10, priority: 0, effect: "raise_all_self_1", flavor: "Sees the failure mode before it happens." },
  { id: "scholarly_rebuke", name: "Scholarly Rebuke", type: "Dragon", category: "special", power: 90, accuracy: 100, pp: 15, priority: 0, effect: null, flavor: "The look alone is withering." },
  { id: "gatekeeping", name: "Gatekeeping", type: "Dragon", category: "status", power: null, accuracy: 90, pp: 10, priority: 0, effect: "paralysis", flavor: "Access denied — the target freezes." },
  { id: "retrospective", name: "Retrospective", type: "Dragon", category: "status", power: null, accuracy: 100, pp: 20, priority: 0, effect: "lower_atk_target", flavor: "'What did we learn?' — the target second-guesses every move." },
  { id: "cosmic_latte", name: "Cosmic Latte", type: "Dragon", category: "special", power: 130, accuracy: 90, pp: 5, priority: 0, effect: null, flavor: "The exact colour of the universe. Perfectly brewed. Devastating." },
  { id: "old_guard", name: "Old Guard", type: "Dragon", category: "physical", power: 100, accuracy: 85, pp: 10, priority: 0, effect: null, flavor: "They were building rockets before it was cool." },
  { id: "mentorship_session", name: "Mentorship Session", type: "Dragon", category: "status", power: null, accuracy: 60, pp: 10, priority: 0, effect: "sleep", flavor: "A 90-minute monologue about 'the old days'." },
  { id: "legacy_wisdom", name: "Legacy Wisdom", type: "Dragon", category: "physical", power: 90, accuracy: 90, pp: 10, priority: 0, effect: null, flavor: "What worked in 1998 still works now." },
  { id: "dragon_breath", name: "Dragon Breath", type: "Dragon", category: "special", power: 60, accuracy: 100, pp: 20, priority: 0, effect: "paralysis_chance_30", flavor: "A measured exhalation of ancient energy." },

  // ── Universal TMs (Normal type, learnable by any) ────────────────────────
  { id: "tackle", name: "Tackle", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 35, priority: 0, effect: null, flavor: "A full-body collision." },
  { id: "quick_attack", name: "Quick Attack", type: "Normal", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1, effect: null, flavor: "First-strike reflex." },
  { id: "swift", name: "Swift", type: "Normal", category: "special", power: 60, accuracy: 101, pp: 20, priority: 0, effect: null, flavor: "Star-shaped rays that cannot miss." },
  { id: "return", name: "Return", type: "Normal", category: "physical", power: 102, accuracy: 100, pp: 10, priority: 0, effect: null, flavor: "Powered by loyalty to the team." },
  { id: "protect", name: "Protect", type: "Normal", category: "status", power: null, accuracy: 101, pp: 10, priority: 4, effect: "protect", flavor: "Fully blocks the next incoming move." },
  { id: "substitute", name: "Substitute", type: "Normal", category: "status", power: null, accuracy: 101, pp: 10, priority: 0, effect: "substitute", flavor: "A decoy absorbs the next hit." },
  { id: "rest", name: "Rest", type: "Normal", category: "status", power: null, accuracy: 101, pp: 10, priority: 0, effect: "rest", flavor: "Fully restores HP — but you're asleep for 2 turns." },
  { id: "sleep_talk", name: "Sleep Talk", type: "Normal", category: "status", power: null, accuracy: 101, pp: 10, priority: 0, effect: "sleep_talk", flavor: "Lash out with a random known move while asleep." },
  { id: "facade", name: "Facade", type: "Normal", category: "physical", power: 70, accuracy: 100, pp: 20, priority: 0, effect: "double_if_statused", flavor: "Pain becomes power." },
  { id: "double_edge", name: "Double-Edge", type: "Normal", category: "physical", power: 120, accuracy: 100, pp: 5, priority: 0, effect: "recoil_33", flavor: "A reckless full-body slam." },
  { id: "giga_impact", name: "Giga Impact", type: "Normal", category: "physical", power: 150, accuracy: 90, pp: 5, priority: 0, effect: "recharge", flavor: "Ultimate force. Must recharge after." },
  { id: "hyper_beam", name: "Hyper Beam", type: "Normal", category: "special", power: 150, accuracy: 90, pp: 5, priority: 0, effect: "recharge", flavor: "Concentrated beam of raw energy." },
  { id: "work_up", name: "Work Up", type: "Normal", category: "status", power: null, accuracy: 101, pp: 30, priority: 0, effect: "raise_atk_spatk_self", flavor: "Gets hyped." },
  { id: "focus_energy", name: "Focus Energy", type: "Normal", category: "status", power: null, accuracy: 101, pp: 30, priority: 0, effect: "crit_rate_up", flavor: "Takes a slow breath. Criticals become likely." },
  { id: "endure", name: "Endure", type: "Normal", category: "status", power: null, accuracy: 101, pp: 10, priority: 4, effect: "endure", flavor: "Survives the next hit with 1 HP." },
  { id: "body_slam", name: "Body Slam", type: "Normal", category: "physical", power: 85, accuracy: 100, pp: 15, priority: 0, effect: "paralysis_chance_30", flavor: "Dead weight, straight down." },
  { id: "take_down", name: "Take Down", type: "Normal", category: "physical", power: 90, accuracy: 85, pp: 20, priority: 0, effect: "recoil_25", flavor: "A reckless tackle — costs HP." },
  { id: "snore", name: "Snore", type: "Normal", category: "special", power: 50, accuracy: 100, pp: 15, priority: 0, effect: "only_while_asleep", flavor: "Rumbling snores that rattle the target." },
  { id: "hyper_voice", name: "Hyper Voice", type: "Normal", category: "special", power: 90, accuracy: 100, pp: 10, priority: 0, effect: null, flavor: "A rocket-range shout." },
  { id: "round", name: "Round", type: "Normal", category: "special", power: 60, accuracy: 100, pp: 15, priority: 0, effect: null, flavor: "A punishing musical phrase. Louder in chorus." },
];

export const MOVES_BY_ID = new Map(MOVES.map((m) => [m.id, m]));

if (new Set(MOVES.map((m) => m.id)).size !== MOVES.length) {
  throw new Error("Duplicate move id in catalog");
}
