import { startWorker } from "./src/workers/base.worker";
import { handleEmailJob } from "./src/workers/features/email/email.handler";
import { handleImageJob } from "./src/workers/features/image/image.handler";
import { handleReportJob } from "./src/workers/features/report/report.handler";
import { startStaleDetector } from "./src/workers/stale-detector";

// Start stale detector — clean up stuck jobs
startStaleDetector({
  checkInterval: 60000, // check every 1 minute
  staleMinutes: 10, // processing > 10 minutes = stale
});

// Start workers
const workers = [
  startWorker({
    queue: "email",
    handler: handleEmailJob,
    concurrency: 3,
  }),
  startWorker({
    queue: "image",
    handler: handleImageJob,
    concurrency: 2,
  }),
  startWorker({
    queue: "report",
    handler: handleReportJob,
    concurrency: 1,
  }),
];

// Graceful shutdown — handle Ctrl+C and SIGTERM
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n[Process] Received ${signal} — starting graceful shutdown...`);

  // Call shutdown() on ALL workers simultaneously
  await Promise.all(workers.map((w) => w.shutdown()));

  console.log("[Process] All workers stopped. Exiting.");
  process.exit(0);
}

// SIGINT = Ctrl+C, SIGTERM = kill command / Docker stop
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
