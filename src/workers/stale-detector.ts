import { resetStaleJobs } from "../shared/queue/mysql-queue";

interface StaleDetectorOptions {
  checkInterval?: number; // how often to check (ms), default 60s
  staleMinutes?: number; // how long in processing before considered stale, default 10 minutes
}

export function startStaleDetector(options: StaleDetectorOptions = {}): void {
  const {
    checkInterval = 60000, // check every 1 minute
    staleMinutes = 10, // processing > 10 minutes = stale
  } = options;

  console.log(
    `[StaleDetector] Started — checking every ${checkInterval / 1000}s, ` +
      `stale threshold: ${staleMinutes}m`,
  );

  async function check(): Promise<void> {
    try {
      await resetStaleJobs(staleMinutes);
    } catch (error) {
      console.error("[StaleDetector] Error:", error);
    }

    setTimeout(check, checkInterval);
  }

  check();
}
