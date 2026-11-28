import { useId } from "react";

type EvRadarStat = {
  stat: string;
  label: string;
  value: number;
  displayValue?: string | number;
  /** Value that reaches the outer ring of this axis; defaults to the EV maximum. */
  maxValue?: number;
  color: string;
};

const MAX_EV_PER_STAT = 252;
const CENTER = 120;
const RADIUS = 80;
const STAT_COUNT = 6;
const EV_CHART_COLOR = "currentColor";
const STAT_LABEL_POSITIONS = [
  { left: 50, top: 7, width: 30 },
  { left: 90, top: 28, width: 20 },
  { left: 90, top: 72, width: 20 },
  { left: 50, top: 93, width: 30 },
  { left: 10, top: 72, width: 20 },
  { left: 10, top: 28, width: 20 },
] as const;
function coordinate(value: number) {
  return Number(value.toFixed(1)).toString();
}

function point(index: number, radius: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / STAT_COUNT;
  return {
    x: coordinate(CENTER + Math.cos(angle) * radius),
    y: coordinate(CENTER + Math.sin(angle) * radius),
  };
}

function pointsForRadius(radius: number) {
  return Array.from({ length: STAT_COUNT }, (_, index) => {
    const { x, y } = point(index, radius);
    return `${x},${y}`;
  }).join(" ");
}

function valueTrianglePoints(index: number, radius: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / STAT_COUNT;
  const halfWidth = 5 * Math.sqrt(radius / RADIUS);
  const offsetX = -Math.sin(angle) * halfWidth;
  const offsetY = Math.cos(angle) * halfWidth;
  const tip = point(index, radius);

  return [
    `${coordinate(CENTER + offsetX)},${coordinate(CENTER + offsetY)}`,
    `${coordinate(CENTER - offsetX)},${coordinate(CENTER - offsetY)}`,
    `${tip.x},${tip.y}`,
  ].join(" ");
}

/** A six-axis EV radar with a readable value for every stat. */
export function EvRadarChart({
  stats,
  increasedStat,
  decreasedStat,
  onSelectStat,
  editStatLabel,
  chartScale = 1,
  onToggle,
  toggleLabel,
  toggled,
}: {
  stats: EvRadarStat[];
  increasedStat?: string;
  decreasedStat?: string;
  onSelectStat?: (stat: string, opener: HTMLButtonElement) => void;
  editStatLabel?: string;
  chartScale?: number;
  /** Clicking the chart itself switches between EV values and calculated stats. */
  onToggle?: () => void;
  toggleLabel?: string;
  toggled?: boolean;
}) {
  const clipId = `ev-radar-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const radii = Array.from({ length: STAT_COUNT }, (_, index) => {
    const stat = stats[index];
    const max = stat?.maxValue || MAX_EV_PER_STAT;
    const value = Math.max(0, Math.min(max, stat?.value ?? 0));
    return (value / max) * RADIUS;
  });
  const valuePoints = radii.map((radius, index) => point(index, radius));

  return (
    <div
      data-ev-radar-chart
      className="flex min-w-0 flex-col items-center gap-2"
      style={{ zoom: chartScale }}
    >
      <div
        data-ev-radar-visual
        className="relative aspect-square w-full max-w-72"
      >
        <svg
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-auto w-full max-w-56 -translate-x-1/2 -translate-y-1/2 text-[#047857] dark:text-[#6ee7b7]"
          viewBox="0 0 240 240"
        >
          <defs>
            <clipPath id={clipId}>
              {Array.from({ length: STAT_COUNT }, (_, index) => {
                const nextIndex = (index + 1) % STAT_COUNT;
                if (radii[index] === 0 || radii[nextIndex] === 0) return null;

                const start = valuePoints[index];
                const end = valuePoints[nextIndex];
                return (
                  <polygon
                    key={index}
                    points={`${CENTER},${CENTER} ${start.x},${start.y} ${end.x},${end.y}`}
                  />
                );
              })}
            </clipPath>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((scale) => (
            <polygon
              key={scale}
              points={pointsForRadius(RADIUS * scale)}
              className="fill-none stroke-foreground"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: STAT_COUNT }, (_, index) => {
            const end = point(index, RADIUS);
            return (
              <line
                key={index}
                x1={CENTER}
                y1={CENTER}
                x2={end.x}
                y2={end.y}
                className="stroke-foreground"
                strokeWidth="1"
              />
            );
          })}
          <g clipPath={`url(#${clipId})`}>
            {Array.from({ length: STAT_COUNT }, (_, index) => {
              const start = point(index, RADIUS);
              const end = point((index + 1) % STAT_COUNT, RADIUS);
              const stat = stats[index];
              return (
                <polygon
                  key={stat?.stat ?? index}
                  points={`${CENTER},${CENTER} ${start.x},${start.y} ${end.x},${end.y}`}
                  fill={EV_CHART_COLOR}
                  fillOpacity="0.4"
                />
              );
            })}
          </g>
          {Array.from({ length: STAT_COUNT }, (_, index) => {
            const stat = stats[index];
            const radius = radii[index];
            if (!stat || radius === 0) return null;
            const value = Math.max(
              0,
              Math.min(stat.maxValue || MAX_EV_PER_STAT, stat.value),
            );

            return (
              <polygon
                key={stat.stat}
                data-ev-stat={stat.stat}
                data-ev-value={value}
                points={valueTrianglePoints(index, radius)}
                fill={EV_CHART_COLOR}
                fillOpacity="0.5"
              />
            );
          })}
          {Array.from({ length: STAT_COUNT }, (_, index) => {
            const stat = stats[index];
            const radius = radii[index];
            if (!stat || radius === 0) return null;
            const end = point(index, radius);
            return (
              <line
                key={stat.stat}
                x1={CENTER}
                y1={CENTER}
                x2={end.x}
                y2={end.y}
                stroke={EV_CHART_COLOR}
                strokeOpacity="0.9"
                strokeWidth="1.5"
              />
            );
          })}
          {Array.from({ length: STAT_COUNT }, (_, index) => {
            const stat = stats[index];
            const radius = radii[index];
            const nextRadius = radii[(index + 1) % STAT_COUNT];
            if (radius === 0 || nextRadius === 0) return null;
            const start = valuePoints[index];
            const end = valuePoints[(index + 1) % STAT_COUNT];
            return (
              <line
                key={stat.stat}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={EV_CHART_COLOR}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            );
          })}
          {Array.from({ length: STAT_COUNT }, (_, index) => {
            const stat = stats[index];
            const radius = radii[index];
            if (!stat || radius === 0) return null;
            const { x, y } = point(index, radius);
            return (
              <circle
                key={stat.stat}
                cx={x}
                cy={y}
                r="3"
                fill={EV_CHART_COLOR}
                className="stroke-surface"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
        {onToggle && (
          <button
            type="button"
            data-ev-radar-toggle
            aria-label={toggleLabel}
            aria-pressed={toggled}
            onClick={onToggle}
            className="absolute left-1/2 top-1/2 size-[62%] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        )}
        {stats.map((stat, index) => {
          const position = STAT_LABEL_POSITIONS[index];
          if (!position) return null;
          const effect =
            stat.stat === increasedStat
              ? "up"
              : stat.stat === decreasedStat
                ? "down"
                : null;

          const label = (
            <>
              <span className="relative mx-auto block w-fit max-w-full">
                <span
                  aria-hidden="true"
                  className={`absolute -left-3 top-1 size-2 rounded-full ${stat.color}`}
                />
                <span className="block min-w-0 max-w-full break-words">
                  {stat.label}
                </span>
                {effect && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-full top-0 ml-1 font-bold leading-none ${effect === "up" ? "text-red-600 dark:text-red-400" : "text-blue-700 dark:text-blue-400"}`}
                  >
                    {effect === "up" ? "↑" : "↓"}
                  </span>
                )}
              </span>
              <span className={`block font-semibold tabular-nums${effect ? " text-foreground" : ""}`}>
                {stat.displayValue ?? stat.value}
              </span>
            </>
          );
          const className = `absolute -translate-x-1/2 -translate-y-1/2 break-words text-center text-xs leading-tight${onSelectStat ? " cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" : ""}`;
          const style = {
            left: `${position.left}%`,
            top: `${position.top}%`,
            width: `${position.width}%`,
          };

          return onSelectStat ? (
            <button
              key={stat.stat}
              type="button"
              data-stat={stat.stat}
              data-nature-effect={effect ?? undefined}
              aria-label={`${editStatLabel ?? "Edit"}: ${stat.label}`}
              onClick={(event) => onSelectStat(stat.stat, event.currentTarget)}
              className={className}
              style={style}
            >
              {label}
            </button>
          ) : (
            <span
              key={stat.stat}
              data-stat={stat.stat}
              data-nature-effect={effect ?? undefined}
              className={className}
              style={style}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}