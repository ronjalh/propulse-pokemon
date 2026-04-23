type Props = {
  size?: number;
  className?: string;
};

/**
 * Propulse Pokemon logo — a pokeball with a rocket-flame thruster below,
 * signalling the "propulse" (thrust) side of the Propulse NTNU team.
 */
export function PropulseLogo({ size = 64, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 96"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Propulse Pokemon"
    >
      <defs>
        <linearGradient id="propulse-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="propulse-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>

      {/* Flame / thrust plume */}
      <path
        d="M 32 66 Q 30 78 36 90 Q 40 82 40 90 Q 44 82 48 90 Q 54 78 48 66 Z"
        fill="url(#propulse-flame)"
        opacity="0.95"
      />
      <path
        d="M 36 70 Q 35 78 40 86 Q 45 78 44 70 Z"
        fill="#FEF3C7"
        opacity="0.85"
      />

      {/* Pokeball — top half (blue) */}
      <path
        d="M 4 40 A 36 36 0 0 1 76 40 L 48 40 A 8 8 0 0 0 32 40 Z"
        fill="url(#propulse-sky)"
        stroke="#1E3A8A"
        strokeWidth="3"
      />
      {/* Pokeball — bottom half (white) */}
      <path
        d="M 4 40 A 36 36 0 0 0 76 40 L 48 40 A 8 8 0 0 1 32 40 Z"
        fill="#F8FAFC"
        stroke="#1E3A8A"
        strokeWidth="3"
      />
      {/* Middle band */}
      <rect x="4" y="37" width="72" height="6" fill="#1E3A8A" />

      {/* Center button (yellow like propulsion) */}
      <circle
        cx="40"
        cy="40"
        r="8"
        fill="#FBBF24"
        stroke="#1E3A8A"
        strokeWidth="3"
      />
      {/* Rocket up-arrow inside button */}
      <path
        d="M 40 34 L 44 42 L 41 42 L 41 46 L 39 46 L 39 42 L 36 42 Z"
        fill="#1E3A8A"
      />

      {/* Highlight */}
      <ellipse cx="22" cy="22" rx="8" ry="4" fill="#FFFFFF" opacity="0.35" />
    </svg>
  );
}
