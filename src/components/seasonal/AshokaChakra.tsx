/**
 * Minimal Ashoka Chakra-inspired motif (24 spokes).
 * Decorative only — purely visual, respects reduced motion via CSS class from parent.
 */
import { TRICOLOUR } from "@/config/seasonal";

interface Props {
  size?: number;
  className?: string;
  color?: string;
  opacity?: number;
}

export default function AshokaChakra({
  size = 64,
  className,
  color = TRICOLOUR.chakra,
  opacity = 1,
}: Props) {
  const spokes = Array.from({ length: 24 }, (_, i) => i * 15);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ opacity }}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="6" fill={color} />
      {spokes.map((deg) => (
        <line
          key={deg}
          x1="50"
          y1="50"
          x2="50"
          y2="6"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
    </svg>
  );
}
