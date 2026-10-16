import { addDays, dayOfWeek, localDate } from "./planner";

// Sunday at 18:00 in the runner's timezone. Convert local wall time to UTC;
// do not add seven UTC days, which would drift across daylight-saving changes.
export function nextWeeklyReminder(now: number, timezone: string): number {
  const date = localDate(now, timezone);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let days = 0; days <= 7; days++) {
    const target = addDays(date, days);
    if (dayOfWeek(target) !== 0) continue;
    const wall = Date.parse(`${target}T18:00:00Z`);
    let instant = wall;
    for (let attempt = 0; attempt < 4; attempt++) {
      const parts = formatter.formatToParts(instant);
      const part = (type: string) => parts.find((p) => p.type === type)!.value;
      const observed = Date.parse(
        `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}Z`,
      );
      const delta = wall - observed;
      instant += delta;
      if (!delta) break;
    }
    if (instant > now) return instant;
  }
  throw new Error("Could not schedule the weekly reminder.");
}
