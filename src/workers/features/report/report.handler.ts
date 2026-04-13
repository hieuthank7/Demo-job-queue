import { Job } from "../../../shared/queue/queue.types";

/**
 * Handle report generation jobs (heavy DB queries, export Excel/PDF)
 * Simulated with delay, in production use exceljs/pdfkit
 */
export async function handleReportJob(job: Job): Promise<void> {
  const { reportType, dateFrom, dateTo } = job.payload;

  switch (job.type) {
    case "daily_revenue":
      console.log(
        `[Report] Generating revenue report (${dateFrom} → ${dateTo})...`,
      );
      await delay(5000); // simulate heavy query taking 5 seconds
      console.log(`[Report] Revenue report generated ✓`);
      break;

    case "user_activity":
      console.log(`[Report] Generating user activity report...`);
      await delay(6000); // simulate 6 seconds
      console.log(`[Report] User activity report generated ✓`);
      break;

    default:
      throw new Error(`Unknown report job type: ${job.type}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
