import { Job, QueueEvents, Worker } from "bullmq";
import { redis } from "../shared/redis";

interface WorkerOptions {
  queue: string;
  handler: (job: Job) => Promise<void>;
  concurrency?: number;
}

export function startWorker(options: WorkerOptions): Worker {
  const { queue, handler, concurrency = 1 } = options;

  const worker = new Worker(queue, handler, {
    connection: redis,
    concurrency,
  });

  worker.on("completed", (job) => {
    console.log(`[${queue}] Job ${job.id} (${job.name}) completed ✓`);
  });

  worker.on("failed", (job, error) => {
    console.log(
      `[${queue}] Job ${job?.id} (${job?.name}) failed: ${error.message}`,
    );
  });

  // Listen to queue events
  const events = new QueueEvents(queue, { connection: redis });
  events.on("progress", ({ jobId, data }) => {
    console.log(`[${queue}] Job ${jobId} progress: ${data}%`);
  });

  console.log(
    `[Worker] Started "${queue}" worker (concurrency: ${concurrency})`,
  );

  return worker;
}
