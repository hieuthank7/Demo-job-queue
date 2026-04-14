import { Job } from "bullmq";

/**
 * Handle report generation jobs (heavy DB queries, export Excel/PDF)
 * Simulated with delay, in production use exceljs/pdfkit
 */
export async function handleReportJob(job: Job): Promise<void> {
  const { dateFrom, dateTo } = job.data;

  switch (job.name) {
    case "daily_revenue":
      console.log(
        `[Report] Generating revenue report (${dateFrom} → ${dateTo})...`,
      );

      await job.updateProgress(10);
      // console.log(`[Report] Step 1/4: Querying database...`);
      await delay(2000);

      await job.updateProgress(40);
      // console.log(`[Report] Step 2/4: Aggregating data...`);
      await delay(1500);

      await job.updateProgress(70);
      // console.log(`[Report] Step 3/4: Formatting report...`);
      await delay(1000);

      await job.updateProgress(100);
      // console.log(`[Report] Revenue report generated ✓`);
      break;

    case "user_activity":
      console.log(`[Report] Generating user activity report...`);

      await job.updateProgress(20);
      // console.log(`[Report] Step 1/3: Fetching user logs...`);
      await delay(2500);

      await job.updateProgress(60);
      // console.log(`[Report] Step 2/3: Analyzing patterns...`);
      await delay(2000);

      await job.updateProgress(100);
      // console.log(`[Report] User activity report generated ✓`);
      break;

    default:
      throw new Error(`Unknown report job type: ${job.name}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
