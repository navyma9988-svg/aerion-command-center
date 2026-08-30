import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  animated?: boolean;
}

/**
 * AERION's shared visual signature: surveyed runway, radar field and live target.
 * The mark inherits the design-system accent so it remains correct in both themes.
 */
export function BrandMark({ className, animated = true }: BrandMarkProps) {
  return (
    <span className={cn("brand-mark", className)} aria-hidden>
      <svg viewBox="0 0 48 48" className="size-full" focusable="false">
        <circle cx="24" cy="24" r="15.5" fill="none" stroke="currentColor" opacity="0.12" />
        <circle cx="24" cy="24" r="10.5" fill="none" stroke="currentColor" opacity="0.22" />
        <path
          d="M24 24 37 11A18.4 18.4 0 0 1 42.4 24Z"
          fill="currentColor"
          opacity="0.12"
          className={cn(animated && "brand-mark__sweep")}
        />
        <g transform="rotate(34 24 24)">
          <rect
            x="21.25"
            y="8.5"
            width="5.5"
            height="31"
            rx="2.75"
            fill="var(--color-card)"
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.95"
          />
          <path
            d="M24 11.5v25"
            fill="none"
            stroke="currentColor"
            strokeDasharray="2.4 2.2"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
        </g>
        <circle cx="24" cy="24" r="3.5" fill="var(--color-card)" stroke="currentColor" />
        <circle cx="24" cy="24" r="1.15" fill="currentColor" />
        <circle cx="34" cy="16.5" r="1.65" fill="currentColor" />
      </svg>
    </span>
  );
}
