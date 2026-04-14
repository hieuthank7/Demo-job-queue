import { Queue } from "bullmq";
import { redis } from "../redis";

// Create queues — each queue type has its own Queue instance
export const emailQueue = new Queue("email", { connection: redis });
export const imageQueue = new Queue("image", { connection: redis });
export const reportQueue = new Queue("report", { connection: redis });

// Map queue name to Queue instance for easy lookup
const queues: Record<string, Queue> = {
  email: emailQueue,
  image: imageQueue,
  report: reportQueue,
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
