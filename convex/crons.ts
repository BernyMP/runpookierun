import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval(
  "recover overdue trial reminders",
  { minutes: 15 },
  internal.billing.rescueReminders,
  {},
);
crons.interval(
  "schedule weekly reminders",
  { minutes: 15 },
  internal.weeklyReminders.enqueueDue,
  {},
);
crons.interval(
  "recover weekly reminders",
  { minutes: 15 },
  internal.weeklyReminders.rescue,
  {},
);
crons.interval(
  "publish approved Pookie editions",
  { minutes: 1 },
  internal.editorial.publishDue,
  {},
);
crons.interval(
  "recover consented ad conversions",
  { minutes: 15 },
  internal.measurement.rescue,
  {},
);
export default crons;
