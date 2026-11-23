import { formatNumber } from "@/lib/format";
import type { DashboardTeam } from "./team-types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Hours always shown; the range widens when people work earlier or later. */
const DEFAULT_FIRST_HOUR = 9;
const DEFAULT_LAST_HOUR = 21;

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}`;
}

/** Interactions by local weekday × hour (spec §5.3). */
export function TeamHeatmap({
  heatmap,
  weekStartsOn,
}: {
  heatmap: DashboardTeam["heatmap"];
  weekStartsOn: number;
}) {
  if (heatmap.total === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        No interactions logged in this period.
      </p>
    );
  }

  const busiest = heatmap.cells.reduce((best, cell) => (cell.count > best.count ? cell : best));
  const counts = new Map(heatmap.cells.map((cell) => [`${cell.weekday}:${cell.hour}`, cell.count]));
  const hoursWithData = heatmap.cells.map((cell) => cell.hour);
  const firstHour = Math.min(DEFAULT_FIRST_HOUR, ...hoursWithData);
  const lastHour = Math.max(DEFAULT_LAST_HOUR, ...hoursWithData);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  const days = Array.from({ length: 7 }, (_, index) => (weekStartsOn + index) % 7);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-separate border-spacing-0.5 text-[10px]">
        <thead>
          <tr>
            <th scope="col" className="w-9" />
            {hours.map((hour) => (
              <th key={hour} scope="col" className="font-normal text-muted-foreground tabular-nums">
                {hourLabel(hour)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day}>
              <th scope="row" className="pr-1 text-left font-normal text-muted-foreground">
                {WEEKDAYS[day]}
              </th>
              {hours.map((hour) => {
                const count = counts.get(`${day}:${hour}`) ?? 0;
                const intensity = heatmap.max > 0 ? count / heatmap.max : 0;
                return (
                  <td
                    key={hour}
                    title={`${WEEKDAYS[day]} ${hourLabel(hour)}:00 — ${formatNumber(count)} interactions`}
                    className="h-5 rounded-[3px] bg-muted/60"
                    style={
                      count > 0
                        ? {
                            backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(15 + intensity * 85)}%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    <span className="sr-only">{count}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {formatNumber(heatmap.total)} interactions · darker = busier · busiest{" "}
        {WEEKDAYS[busiest.weekday]} {hourLabel(busiest.hour)}:00 ({formatNumber(busiest.count)})
      </p>
    </div>
  );
}
