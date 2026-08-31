import { useId } from "react";
import { FLIGHTS, RUNWAYS } from "@/lib/airfield-data";
import { PIERS, RUNWAY_GEOM, TAXIWAYS, TOWER, WORLD } from "@/lib/airfield-geo";
import { cn } from "@/lib/utils";

function previewTarget(flight: (typeof FLIGHTS)[number]) {
  const runway = RUNWAY_GEOM[flight.runway] ?? RUNWAY_GEOM["17C/35C"]!;
  const progress = flight.movement === "arrival" ? flight.progress : 1 - flight.progress;
  const dirX = flight.movement === "arrival" ? runway.x2 - runway.x1 : runway.x1 - runway.x2;
  const dirY = flight.movement === "arrival" ? runway.y2 - runway.y1 : runway.y1 - runway.y2;
  const length = Math.hypot(dirX, dirY) || 1;
  const offset = flight.status === "Taxiing" || flight.status === "At gate" ? 26 : 0;
  return {
    x: runway.x1 + (runway.x2 - runway.x1) * progress + (-dirY / length) * offset,
    y: runway.y1 + (runway.y2 - runway.y1) * progress + (dirX / length) * offset,
    heading: Number(((Math.atan2(dirX, -dirY) * 180) / Math.PI).toFixed(6)),
  };
}

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
        aria-label={`Simulated DFW surface overlay on 2022 USGS aerial imagery. ${activeMovements} active movements and ${alertCount} open disruptions.`}
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

        <image
          href="/dfw-aerial-usgs-naip-2022.webp"
          x="0"
          y="0"
          width={WORLD.w}
          height={WORLD.h}
          preserveAspectRatio="none"
          className="surface-radar__aerial-image"
        />
        <rect width={WORLD.w} height={WORLD.h} className="surface-radar__aerial-tint" />
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

        <g opacity="0.38">
          {TAXIWAYS.map((taxiway, index) => (
            <line
              key={index}
              {...taxiway}
              stroke="var(--color-foreground)"
              strokeWidth="4"
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
                stroke="var(--color-background)"
                strokeOpacity="0.74"
                strokeWidth={geometry.width + 10}
                strokeLinecap="round"
              />
              <line
                {...geometry}
                stroke="var(--color-foreground)"
                strokeOpacity="0.56"
                strokeWidth={geometry.width}
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

        {FLIGHTS.map((flight) => {
          const target = previewTarget(flight);
          const tone = flight.delayMin > 15 ? "var(--color-coral)" : "var(--color-cyan)";
          return (
            <g key={flight.id} transform={`rotate(${target.heading} ${target.x} ${target.y})`}>
              <circle
                cx={target.x}
                cy={target.y}
                r="17"
                fill="none"
                stroke={tone}
                strokeOpacity="0.24"
                strokeWidth="2"
                className="surface-radar__target-halo"
              />
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
          <span aria-hidden /> SIM SURFACE
        </span>
        <span className="mono-data">AERIAL · N↑</span>
      </div>
      <div className="surface-radar__telemetry" aria-hidden="true">
        <span className="mono-data">TRK {activeMovements.toString().padStart(2, "0")}</span>
        <span className="mono-data">USGS · 2022</span>
        <span className={cn("mono-data", degraded ? "text-coral" : "text-success")}>
          {degraded ? `${alertCount} ALERT` : "NOMINAL"}
        </span>
      </div>
    </div>
  );
}
