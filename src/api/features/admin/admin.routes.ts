import { Router, Request, Response } from "express";
import {
  getDeadJobs,
  getQueueStats,
  retryDeadJob,
} from "../../../shared/queue/mysql-queue";

const router = Router();

/**
 * List all dead jobs
 * GET /api/admin/dead-jobs
 */
router.get("/dead-jobs", async (_req: Request, res: Response) => {
  try {
    const jobs = await getDeadJobs();
    res.json({ count: jobs.length, jobs });
  } catch (error) {
    console.error("[Admin] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Retry a single dead job
 * POST /api/admin/dead-jobs/:id/retry
 */
router.post("/dead-jobs/:id/retry", async (req: Request, res: Response) => {
  try {
    const jobId = Number(req.params.id);

    if (isNaN(jobId)) {
      res.status(400).json({ error: "Invalid job ID" });
      return;
    }

    const success = await retryDeadJob(jobId);

    if (!success) {
      res.status(404).json({ error: "Dead job not found" });
      return;
    }

    res.json({ message: `Job #${jobId} queued for retry` });
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
    const stats = await getQueueStats();
    res.json({ stats });
  } catch (error) {
    console.error("[Admin] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
