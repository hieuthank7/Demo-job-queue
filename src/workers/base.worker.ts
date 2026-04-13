import { getNextJob, completeJob, failJob } from "../shared/queue/mysql-queue";
import { Job } from "../shared/queue/queue.types";

// Handler function type — each queue has its own handler
type JobHandler = (job: Job) => Promise<void>;

interface WorkerOptions {
  queue: string; // queue name: 'email', 'image'...
  handler: JobHandler; // function to process each job
  pollInterval?: number; // how often to check for jobs (ms), default 5000
  concurrency?: number; // max number of jobs to process in parallel
  workerId?: string; // worker identifier for debugging
}

export function startWorker(options: WorkerOptions): {
  shutdown: () => Promise<void>;
} {
  const {
    queue,
    handler,
    pollInterval = 5000,
    concurrency = 1,
    workerId = `worker-${queue}-${process.pid}`,
  } = options;

  let activeCount = 0;
  let isShuttingDown = false;

  console.log(
    `[Worker] ${workerId} started — polling "${queue}" queue every ${pollInterval}ms`,
  );

  // Polling loop
  async function poll(): Promise<void> {
    // Shutting down -> stop accepting new jobs
    if (isShuttingDown) return;

    // At max concurrency -> wait, don't pick up more
    if (activeCount >= concurrency) {
      setTimeout(poll, 100); // recheck after 100ms
      return;
    }
    try {
      // 1. Fetch next job from queue
      const job = await getNextJob(queue, workerId);

      // 2. No jobs available -> wait then poll again
      if (!job) {
        setTimeout(poll, pollInterval);
        return;
      }

      // Increment counter BEFORE processing
      activeCount++;
      console.log(
        `[Worker] ${workerId} picked up Job #${job.id} ` +
          `(type: ${job.type}) [active: ${activeCount}/${concurrency}]`,
      );

      // Process job ASYNCHRONOUSLY — no await, so we can poll for the next one immediately
      processJob(job, handler, workerId).finally(() => {
        activeCount--; // Done -> release slot
      });

      // Poll IMMEDIATELY for next job (if concurrency slots available)
      setImmediate(poll);
    } catch (error) {
      // System error (DB down, connection lost...) -> wait then retry
      console.error(`[Worker] ${workerId} system error:`, error);
      setTimeout(poll, pollInterval);
    }
  }

  // Start polling
  poll();

  // Return shutdown function for worker.ts to call when stopping
  return {
    shutdown: (): Promise<void> => {
      return new Promise((resolve) => {
        isShuttingDown = true;
        console.log(
          `[Worker] ${workerId} shutting down... ` +
            `waiting for ${activeCount} active jobs`,
        );

        // Check every 500ms if there are still active jobs
        const interval = setInterval(() => {
          if (activeCount === 0) {
            clearInterval(interval);
            console.log(`[Worker] ${workerId} shutdown complete ✓`);
            resolve();
          }
        }, 500);
      });
    },
  };
}

/**
 * Process a single job — separated to run asynchronously
 */
async function processJob(
  job: Job,
  handler: JobHandler,
  workerId: string,
): Promise<void> {
  try {
    await handler(job);
    await completeJob(job.id);
  } catch (error: any) {
    await failJob(job.id, error.message || "Unknown error");
  }
}
