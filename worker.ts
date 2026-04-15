import { startWorker } from "./src/workers/bullmq-worker";
import {
  handleEmailJob,
  handleImageJob,
  handleReportJob,
  handleUserJob,
} from "./src/workers/features";
import { registerRepeatableJobs } from "./src/workers/scheduler";

// Register all repeatable jobs (runs once on startup)
registerRepeatableJobs().catch((err) => {
  console.error("[Scheduler] Failed to register:", err);
});

// Start workers
const workers = [
  startWorker({
    queue: "user",
    handler: handleUserJob,
    concurrency: 2,
  }),
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

  // Call close() on ALL workers simultaneously
  await Promise.all(workers.map((w) => w.close()));

  console.log("[Process] All workers stopped. Exiting.");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
