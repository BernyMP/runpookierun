export const events = {
  ACCOUNT: "account_created",
  SETUP: "setup_completed",
  TRIAL: "trial_started",
  FIRST_RUN: "first_run_completed",
  RUN: "workout_completed",
  SECOND_WEEK: "second_week_started",
  PAID: "paid_conversion",
  RENEWAL: "subscription_renewed",
  CANCEL: "subscription_canceled",
} as const;
