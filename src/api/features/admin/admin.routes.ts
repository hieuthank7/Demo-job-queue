import { Router, Request, Response } from "express";
import {
  emailQueue,
  imageQueue,
  reportQueue,
} from "../../../shared/queue/bullmq-queue";

const router = Router();
const queues = [emailQueue, imageQueue, reportQueue];

/**
 * List all dead jobs
 * GET /api/admin/dead-jobs
 */
router.get("/dead-jobs", async (_req: Request, res: Response) => {
  try {
    const allFailed = [];

    for (const queue of queues) {
      const failed = await queue.getFailed();
      allFailed.push(
        ...failed.map((job) => ({
          id: job.id,
          queue: queue.name,
          name: job.name,
          data: job.data,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
        })),
      );
    }

    res.json({ count: allFailed.length, jobs: allFailed });
  } catch (error) {
    console.error("[Admin] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Retry a failed job
 * POST /api/admin/dead-jobs/:id/retry?queue=email
 */
router.post("/dead-jobs/:id/retry", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.id);
    const queueName = String(req.query.queue);

    const queue = queues.find((q) => q.name === queueName);
    if (!queue) {
      res.status(400).json({ error: "Queue name required (?queue=email)" });
      return;
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    await job.retry();
    res.json({ message: `Job ${jobId} queued for retry` });
  } catch (error) {
    console.error("[Admin] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get statistics for all queues
 * GET /api/admin/queues/stats
 */
router.get("/queues/stats", async (_req: Request, res: Response) => {
  try {
    const stats = [];

    for (const queue of queues) {
      const counts = await queue.getJobCounts();
      stats.push({
        queue: queue.name,
        ...counts,
      });
    }

    res.json({ stats });
  } catch (error) {
    console.error("[Admin] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
