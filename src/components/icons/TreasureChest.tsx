type Props = {
  state: "closed" | "open";
  size?: number;
  className?: string;
};

/** Inline SVG treasure chest. `open` state shows gold spilling out. */
export function TreasureChest({ state, size = 128, className }: Props) {
  const isOpen = state === "open";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 112"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Ground shadow */}
      <ellipse cx="64" cy="106" rx="44" ry="4" fill="#000" opacity="0.2" />

      {/* Chest body */}
      <rect
        x="16"
        y="52"
        width="96"
        height="48"
        rx="4"
        fill="#8B5A2B"
        stroke="#3E2512"
        strokeWidth="3"
      />

      {/* Wooden planks */}
      <line x1="40" y1="54" x2="40" y2="98" stroke="#5A3A1E" strokeWidth="1.5" />
      <line x1="64" y1="54" x2="64" y2="98" stroke="#5A3A1E" strokeWidth="1.5" />
      <line x1="88" y1="54" x2="88" y2="98" stroke="#5A3A1E" strokeWidth="1.5" />

      {/* Metal band around the body */}
      <rect x="16" y="76" width="96" height="6" fill="#D4A574" />
      <rect
        x="16"
        y="76"
        width="96"
        height="6"
        fill="none"
        stroke="#3E2512"
        strokeWidth="1"
      />

      {/* Corner rivets */}
      {[
        [22, 58],
        [106, 58],
        [22, 94],
        [106, 94],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2" fill="#F2C879" stroke="#3E2512" strokeWidth="0.5" />
      ))}

      {/* ── Lid ─────────────────────────────────── */}
      {isOpen ? (
        <>
          {/* Lid tilted back */}
          <g transform="rotate(-40, 16, 52)">
            <path
              d="M 16 52 Q 16 24 40 24 L 88 24 Q 112 24 112 52 Z"
              fill="#A0673A"
              stroke="#3E2512"
              strokeWidth="3"
            />
            <path
              d="M 16 52 Q 16 24 40 24 L 88 24"
              fill="none"
              stroke="#D4A574"
              strokeWidth="2"
            />
            <rect x="58" y="40" width="12" height="8" rx="1.5" fill="#F2C879" stroke="#3E2512" strokeWidth="1" />
          </g>

          {/* Gold spilling out */}
          <g>
            {/* Glow */}
            <ellipse cx="64" cy="52" rx="44" ry="10" fill="#FFE066" opacity="0.45" />
            {/* Coins stacking */}
            <circle cx="46" cy="56" r="7" fill="#FFD34F" stroke="#B8860B" strokeWidth="1.5" />
            <circle cx="58" cy="50" r="8" fill="#FFE066" stroke="#B8860B" strokeWidth="1.5" />
            <circle cx="72" cy="54" r="7" fill="#FFD34F" stroke="#B8860B" strokeWidth="1.5" />
            <circle cx="84" cy="48" r="8" fill="#FFE066" stroke="#B8860B" strokeWidth="1.5" />
            <circle cx="54" cy="62" r="6" fill="#FFC93C" stroke="#B8860B" strokeWidth="1.5" />
            <circle cx="68" cy="64" r="7" fill="#FFE066" stroke="#B8860B" strokeWidth="1.5" />
            <circle cx="80" cy="62" r="6" fill="#FFD34F" stroke="#B8860B" strokeWidth="1.5" />

            {/* Sparkles */}
            <g fill="#FFF7C2">
              <path d="M 36 30 L 38 34 L 42 36 L 38 38 L 36 42 L 34 38 L 30 36 L 34 34 Z" />
              <path d="M 98 34 L 99 37 L 102 38 L 99 39 L 98 42 L 97 39 L 94 38 L 97 37 Z" transform="scale(0.85) translate(10 -2)" />
              <path d="M 90 18 L 91 21 L 94 22 L 91 23 L 90 26 L 89 23 L 86 22 L 89 21 Z" />
            </g>
          </g>
        </>
      ) : (
        <>
          {/* Closed lid */}
          <path
            d="M 16 52 Q 16 28 40 28 L 88 28 Q 112 28 112 52 Z"
            fill="#A0673A"
            stroke="#3E2512"
            strokeWidth="3"
          />
          {/* Band on lid */}
          <path
            d="M 16 52 Q 16 30 40 30 L 88 30 Q 112 30 112 52"
            fill="none"
            stroke="#D4A574"
            strokeWidth="3"
          />
          {/* Lock plate */}
          <rect
            x="56"
            y="44"
            width="16"
            height="18"
            rx="2"
            fill="#F2C879"
            stroke="#3E2512"
            strokeWidth="1.5"
          />
          {/* Keyhole */}
          <circle cx="64" cy="50" r="2" fill="#3E2512" />
          <path d="M 64 52 L 63 57 L 65 57 Z" fill="#3E2512" />

          {/* Faint glow suggesting it's full */}
          <ellipse cx="64" cy="42" rx="30" ry="3" fill="#FFE066" opacity="0.2" />
        </>
      )}
    </svg>
  );
}
