import { useId } from "react";
import { FLIGHTS, RUNWAYS } from "@/lib/airfield-data";
import { PIERS, RUNWAY_GEOM, TAXIWAYS, TOWER, WORLD } from "@/lib/airfield-geo";
import { cn } from "@/lib/utils";

const TARGETS = [
  { x: TOWER.x - 172, y: TOWER.y - 128, heading: -16 },
  { x: TOWER.x + 198, y: TOWER.y - 72, heading: 174 },
  { x: TOWER.x - 90, y: TOWER.y + 156, heading: 8 },
  { x: TOWER.x + 252, y: TOWER.y + 126, heading: -142 },
] as const;

export function SurfaceRadarPreview({
  alertCount,
  activeMovements,
  degraded,
  className,
}: {
  alertCount: number;
  activeMovements: number;
  degraded: boolean;
  className?: string;
}) {
  const uid = useId().replaceAll(":", "");
  const sweepId = `surface-sweep-${uid}`;
  const glowId = `surface-glow-${uid}`;

  return (
    <div className={cn("surface-radar", className)}>
      <svg
        viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
        role="img"
        aria-label={`DFW surface surveillance preview. ${activeMovements} active movements and ${alertCount} open disruptions.`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={glowId} cx="50%" cy="50%" r="58%">
            <stop offset="0" stopColor="var(--color-cyan)" stopOpacity="0.1" />
            <stop offset="0.58" stopColor="var(--color-background)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--color-background)" stopOpacity="0.92" />
          </radialGradient>
          <linearGradient id={sweepId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--color-cyan)" stopOpacity="0" />
            <stop offset="0.72" stopColor="var(--color-cyan)" stopOpacity="0.03" />
            <stop offset="1" stopColor="var(--color-cyan)" stopOpacity="0.26" />
          </linearGradient>
          <pattern id={`grid-${uid}`} width="42" height="42" patternUnits="userSpaceOnUse">
            <path
              d="M 42 0 L 0 0 0 42"
              fill="none"
              stroke="var(--color-cyan)"
              strokeOpacity="0.045"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect width={WORLD.w} height={WORLD.h} fill={`url(#${glowId})`} />
        <rect width={WORLD.w} height={WORLD.h} fill={`url(#grid-${uid})`} />

        {[126, 250, 374, 498].map((radius) => (
          <circle
            key={radius}
            cx={TOWER.x}
            cy={TOWER.y}
            r={radius}
            fill="none"
            stroke="var(--color-cyan)"
            strokeOpacity="0.1"
            strokeWidth="1.4"
          />
        ))}

        <g opacity="0.34">
          {TAXIWAYS.map((taxiway, index) => (
            <line
              key={index}
              {...taxiway}
              stroke="var(--color-muted-foreground)"
              strokeWidth="5"
              strokeLinecap="round"
            />
          ))}
        </g>

        {RUNWAYS.map((runway) => {
          const geometry = RUNWAY_GEOM[runway.id]!;
          const stroke =
            runway.status === "closed"
              ? "var(--color-coral)"
              : runway.status === "notam"
                ? "var(--color-amber)"
                : "var(--color-success)";
          return (
            <g key={runway.id}>
              <line
                {...geometry}
                stroke="var(--color-foreground)"
                strokeOpacity="0.12"
                strokeWidth={geometry.width + 7}
                strokeLinecap="round"
              />
              <line
                {...geometry}
                stroke={stroke}
                strokeOpacity={runway.status === "active" ? 0.7 : 0.9}
                strokeWidth="3.4"
                strokeDasharray={runway.status === "notam" ? "18 12" : undefined}
              />
            </g>
          );
        })}

        {PIERS.map((pier) => (
          <g key={pier.t}>
            <circle cx={pier.x} cy={pier.y} r="17" fill="var(--color-elevated)" />
            <circle
              cx={pier.x}
              cy={pier.y}
              r="17"
              fill="none"
              stroke="var(--color-cyan)"
              strokeOpacity="0.42"
              strokeWidth="2"
            />
            <text
              x={pier.x}
              y={pier.y + 6}
              textAnchor="middle"
              fill="var(--color-foreground)"
              fontSize="15"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              {pier.t}
            </text>
          </g>
        ))}

        <g
          className="surface-radar__sweep"
          style={{ transformOrigin: `${TOWER.x}px ${TOWER.y}px` }}
        >
          <path
            d={`M ${TOWER.x} ${TOWER.y} L ${TOWER.x + 520} ${TOWER.y - 62} A 525 525 0 0 1 ${TOWER.x + 520} ${TOWER.y + 62} Z`}
            fill={`url(#${sweepId})`}
          />
          <line
            x1={TOWER.x}
            y1={TOWER.y}
            x2={TOWER.x + 520}
            y2={TOWER.y}
            stroke="var(--color-cyan)"
            strokeOpacity="0.42"
            strokeWidth="1.7"
          />
        </g>

        <circle cx={TOWER.x} cy={TOWER.y} r="6" fill="var(--color-amber)" />
        <circle
          cx={TOWER.x}
          cy={TOWER.y}
          r="17"
          fill="none"
          stroke="var(--color-amber)"
          strokeOpacity="0.48"
          strokeWidth="2"
        />

        {TARGETS.map((target, index) => {
          const flight = FLIGHTS[index];
          if (!flight) return null;
          const tone = flight.delayMin > 15 ? "var(--color-coral)" : "var(--color-cyan)";
          return (
            <g key={flight.id} transform={`rotate(${target.heading} ${target.x} ${target.y})`}>
              <path
                d={`M ${target.x} ${target.y - 11} L ${target.x + 8} ${target.y + 9} L ${target.x} ${target.y + 4} L ${target.x - 8} ${target.y + 9} Z`}
                fill={tone}
              />
              <line
                x1={target.x}
                y1={target.y + 9}
                x2={target.x}
                y2={target.y + 28}
                stroke={tone}
                strokeOpacity="0.34"
                strokeWidth="2.5"
              />
            </g>
          );
        })}
      </svg>

      <div className="surface-radar__topline">
        <span className="surface-radar__live">
          <span aria-hidden /> LIVE SURFACE
        </span>
        <span className="mono-data">DFW · ASDE-X</span>
      </div>
      <div className="surface-radar__telemetry" aria-hidden="true">
        <span className="mono-data">TRK {activeMovements.toString().padStart(2, "0")}</span>
        <span className={cn("mono-data", degraded ? "text-coral" : "text-success")}>
          {degraded ? `${alertCount} ALERT` : "NOMINAL"}
        </span>
      </div>
    </div>
  );
}
