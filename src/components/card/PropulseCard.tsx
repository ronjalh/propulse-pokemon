import Image from "next/image";
import type { Card, Person, BaseStats, IVs } from "@/lib/db/schema";
import { computeFinalStats } from "@/lib/cards/stats";
import { TYPE_COLORS, rarityBorderClass } from "@/lib/design/type-colors";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

type Props = {
  card: Pick<Card, "id" | "isShiny" | "ivs"> & { level?: number };
  person: Pick<
    Person,
    | "name"
    | "title"
    | "imageUrl"
    | "discipline"
    | "subDiscipline"
    | "primaryType"
    | "secondaryType"
    | "baseStats"
    | "rarity"
  >;
  size?: Size;
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "w-48 h-72 text-xs",
  md: "w-60 h-[23rem] text-sm",
  lg: "w-80 h-[31rem] text-base",
};

function StatRow({ label, value, max = 200 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-xs uppercase tracking-wide font-medium">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-black/25 rounded-full overflow-hidden">
        <div className="h-full bg-white" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums text-xs font-semibold">
        {value}
      </span>
    </div>
  );
}

export function PropulseCard({ card, person, size = "md" }: Props) {
  const primary = TYPE_COLORS[person.primaryType];
  const secondary = person.secondaryType ? TYPE_COLORS[person.secondaryType] : primary;
  const cardLevel = card.level ?? 1;
  const final = computeFinalStats(
    person.baseStats as BaseStats,
    card.ivs as IVs,
    card.isShiny,
    cardLevel,
  );

  const gradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
  const shiny = card.isShiny;
  const displayName = shiny ? `Shiny ${person.name}` : person.name;

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 overflow-hidden shadow-lg text-white flex flex-col",
        SIZE_CLASSES[size],
        rarityBorderClass(person.rarity),
        shiny && "shiny-card",
      )}
      style={{ background: gradient }}
    >
      {shiny && (
        <>
          {/* Rainbow holographic tint */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-45 mix-blend-color-dodge"
            style={{
              background:
                "linear-gradient(135deg, #ff3d8b 0%, #ffb020 20%, #fff04a 40%, #3dff9f 60%, #40c4ff 80%, #b45dff 100%)",
            }}
          />
          {/* Animated white shimmer sweep */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 shiny-sweep mix-blend-overlay"
          />
          {/* Bright "SHINY" badge top-right */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide text-white shadow"
            style={{
              background:
                "linear-gradient(90deg, #ff3d8b, #ffb020, #fff04a, #3dff9f, #40c4ff, #b45dff)",
              textShadow: "0 1px 2px rgba(0,0,0,0.7)",
            }}
          >
            ✨ SHINY
          </div>
        </>
      )}

      {/* header */}
      <div className="flex items-start justify-between px-3 pt-2">
        <div className="min-w-0">
          <div className="font-bold leading-tight truncate">{displayName}</div>
          <div className="text-xs leading-tight truncate text-white/95">
            {person.title}
          </div>
          <span
            className="mt-1 inline-block px-1.5 py-0.5 rounded bg-black/50 text-xs tracking-wide font-semibold"
            aria-label={`Level ${cardLevel}`}
          >
            LV {cardLevel}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0 ml-2">
          <span className="px-1.5 py-0.5 rounded bg-black/40 text-xs font-semibold">
            {person.primaryType}
          </span>
          {person.secondaryType && (
            <span className="px-1.5 py-0.5 rounded bg-black/40 text-xs font-semibold">
              {person.secondaryType}
            </span>
          )}
        </div>
      </div>

      {/* image */}
      <div className="relative mx-3 mt-2 aspect-square rounded-lg overflow-hidden bg-white/10 ring-1 ring-white/20">
        <Image
          src={person.imageUrl}
          alt={person.name}
          fill
          sizes="240px"
          className="object-cover"
        />
      </div>

      {/* stats */}
      <div className="px-3 pt-2 space-y-1">
        <StatRow label="HP" value={final.hp} max={220} />
        <StatRow label="ATK" value={final.attack} max={180} />
        <StatRow label="DEF" value={final.defense} max={180} />
        <StatRow label="SpA" value={final.spAttack} max={180} />
        <StatRow label="SpD" value={final.spDefense} max={180} />
        <StatRow label="SPE" value={final.speed} max={180} />
      </div>

      {/* footer */}
      <div className="mt-auto px-3 pb-2 pt-1 flex items-center justify-between text-xs">
        <span className="uppercase tracking-wide font-medium">
          {person.discipline}
          {person.subDiscipline ? ` · ${person.subDiscipline}` : ""}
        </span>
        <span className="uppercase font-bold">{person.rarity}</span>
      </div>
    </div>
  );
}
