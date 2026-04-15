import { addRepeatableJob } from "../shared/queue/bullmq-queue";

/**
 * Register all repeatable jobs when worker starts
 * These jobs run on a schedule, no API call needed
 */
export async function registerRepeatableJobs(): Promise<void> {
  // Daily revenue report — every 10 seconds for demo
  // In production: pattern: "0 8 * * *" (8:00 AM daily)
  await addRepeatableJob(
    "report",
    "daily_revenue",
    {
      reportType: "revenue",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-16",
    },
    { every: 10000 }, // every 10 seconds
  );

  // User activity report — every 20 seconds for demo
  // In production: pattern: "0 */6 * * *" (every 6 hours)
  await addRepeatableJob(
    "report",
    "user_activity",
    { reportType: "activity" },
    { every: 20000 }, // every 20 seconds
  );

  console.log("[Scheduler] All repeatable jobs registered ✓");
}
