import { Queue, FlowProducer } from "bullmq";
import { redis } from "../redis";

// Create queues — each queue type has its own Queue instance
export const emailQueue = new Queue("email", { connection: redis });
export const imageQueue = new Queue("image", { connection: redis });
export const reportQueue = new Queue("report", { connection: redis });
export const userQueue = new Queue("user", { connection: redis });

// Map queue name to Queue instance for easy lookup
const queues: Record<string, Queue> = {
  email: emailQueue,
  image: imageQueue,
  report: reportQueue,
  user: userQueue,
};

// Add a job to the appropriate queue
export async function addJob(
  queueName: string,
  jobType: string,
  payload: Record<string, any>,
  options?: {
    priority?: number;
    delay?: number;
    attempts?: number;
  },
) {
  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  const job = await queue.add(jobType, payload, {
    priority: options?.priority,
    delay: options?.delay,
    attempts: options?.attempts ?? 3,
    backoff: {
      type: "exponential",
      delay: 30000, // first retry after 30s, then 60s, 120s...
    },
  });

  console.log(
    `[Queue] Job added: ${jobType} (id: ${job.id}) → queue: ${queueName}`,
  );
  return job;
}

/**
 * Add a repeatable job (runs on a schedule)
 * @param queueName - queue to add to
 * @param jobType - job type/name
 * @param payload - job data
 * @param pattern - cron pattern (e.g. "0 8 * * *") OR { every: ms }
 */
export async function addRepeatableJob(
  queueName: string,
  jobType: string,
  payload: Record<string, any>,
  schedule: { pattern?: string; every?: number },
) {
  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  const job = await queue.add(jobType, payload, {
    repeat: schedule,
  });

  console.log(
    `[Queue] Repeatable job added: ${jobType} → queue: ${queueName}, schedule:`,
    schedule,
  );
  return job;
}

// Flow producer — used to create job chains (parent/child dependencies)
export const flowProducer = new FlowProducer({ connection: redis });
