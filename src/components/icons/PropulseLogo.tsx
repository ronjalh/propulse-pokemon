type Props = {
  size?: number;
  className?: string;
};

/**
 * Propulse Pokemon logo — a pokeball with a Propulse-style "P" on the
 * blue upper half. Gray center button like a classic pokeball.
 */
export function PropulseLogo({ size = 64, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Propulse Pokemon"
    >
      <defs>
        <linearGradient id="propulse-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>

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

      {/* Propulse-style "P" on the blue half — clean sans-serif,
          left-aligned to read like a brand mark. */}
      <g transform="translate(16 10)" fill="#F8FAFC">
        <path
          d="
            M 0 0
            L 0 22
            L 6 22
            L 6 14
            L 12 14
            C 18 14 22 10.5 22 7
            C 22 3 18 0 12 0
            Z
            M 6 4
            L 12 4
            C 14.5 4 16 5.2 16 7
            C 16 8.8 14.5 10 12 10
            L 6 10
            Z
          "
        />
      </g>

      {/* Center button — classic gray */}
      <circle
        cx="40"
        cy="40"
        r="8"
        fill="#E5E7EB"
        stroke="#1E3A8A"
        strokeWidth="3"
      />
      <circle cx="40" cy="40" r="4" fill="#F8FAFC" stroke="#1E3A8A" strokeWidth="1.5" />

      {/* Subtle highlight */}
      <ellipse cx="22" cy="22" rx="8" ry="4" fill="#FFFFFF" opacity="0.35" />
    </svg>
  );
}
