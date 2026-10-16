import { addDays, type Week } from "./planner";

export function recentProgress(weeks: Week[], today: string) {
  const latest = weeks[0];
  const anchor = latest && latest.endDate >= today ? latest.startDate : today;
  return Array.from({ length: 4 }, (_, index) => {
    const startDate = addDays(anchor, -7 * index);
    const endDate = addDays(startDate, 6);
    const completed = weeks
      .flatMap((week) => week.workouts)
      .filter(
        (run) =>
          run.kind !== "rest" &&
          run.status === "done" &&
          run.date >= startDate &&
          run.date <= endDate,
      ).length;
    return { startDate, endDate, completed };
  });
}
