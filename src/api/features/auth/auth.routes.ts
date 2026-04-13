import { Router, Request, Response } from "express";
import { registerUser } from "./auth.service";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    // Basic validation
    if (!email || !name) {
      res.status(400).json({ error: "Email and name are required" });
      return;
    }

    const { userId, jobId } = await registerUser({ email, name });

    res.status(201).json({
      message: "Registration successful! Welcome email will be sent shortly.",
      userId,
      jobId,
    });
  } catch (error: any) {
    // Duplicate email check
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "Email already exists" });
      return;
    }
    console.error("[Auth] Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * TEST endpoint: create a job that will fail to test retry mechanism
 * POST /api/auth/test-fail-job
 */
router.post("/test-fail-job", async (req: Request, res: Response) => {
  try {
    const { email, name, type = "failing_email" } = req.body;

    const { addJob } = await import("../../../shared/queue/mysql-queue");

    const jobId = await addJob({
      queue: "email",
      type, // 'failing_email' or 'flaky_email'
      payload: { email, name },
      max_attempts: 3,
    });

    res.status(201).json({
      message: `Test job created (type: ${type})`,
      jobId,
    });
  } catch (error: any) {
    console.error("[Test] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * TEST: Create OTP job (high priority) — verify it gets processed first
 * POST /api/auth/send-otp
 */
router.post("/send-otp", async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      res.status(400).json({ error: "Email and name are required" });
      return;
    }

    const { addJob } = await import("../../../shared/queue/mysql-queue");
    const { JobPriority } = await import("../../../shared/queue/queue.types");

    const jobId = await addJob({
      queue: "email",
      type: "otp_email",
      payload: { email, name, otp: "123456" },
      priority: JobPriority.URGENT, // priority = 2
    });

    res.status(201).json({
      message: "OTP job created with URGENT priority",
      jobId,
      priority: "URGENT (2)",
    });
  } catch (error: any) {
    console.error("[Auth] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * TEST: Create reminder job (delayed 10 seconds) — verify it waits before processing
 * POST /api/auth/send-reminder
 */
router.post("/send-reminder", async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      res.status(400).json({ error: "Email and name are required" });
      return;
    }

    const { addJob } = await import("../../../shared/queue/mysql-queue");

    // Delay 10 seconds for demo (production would use 24 hours)
    const scheduledAt = new Date(Date.now() + 10 * 1000);

    const jobId = await addJob({
      queue: "email",
      type: "reminder_email",
      payload: { email, name },
      scheduled_at: scheduledAt,
    });

    res.status(201).json({
      message: `Reminder scheduled after 10 seconds`,
      jobId,
      scheduled_at: scheduledAt.toISOString(),
    });
  } catch (error: any) {
    console.error("[Auth] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * TEST: Create image processing job
 * POST /api/auth/test-image-job
 */
router.post("/test-image-job", async (req: Request, res: Response) => {
  try {
    const { addJob } = await import("../../../shared/queue/mysql-queue");

    const jobId = await addJob({
      queue: "image",
      type: "resize_avatar",
      payload: {
        imagePath: "/uploads/avatar.jpg",
        width: 200,
        height: 200,
      },
    });

    res.status(201).json({ message: "Image job created", jobId });
  } catch (error: any) {
    console.error("[Test] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * TEST: Create report generation job
 * POST /api/auth/test-report-job
 */
router.post("/test-report-job", async (req: Request, res: Response) => {
  try {
    const { addJob } = await import("../../../shared/queue/mysql-queue");

    const jobId = await addJob({
      queue: "report",
      type: "daily_revenue",
      payload: {
        reportType: "revenue",
        dateFrom: "2026-04-01",
        dateTo: "2026-04-12",
      },
    });

    res.status(201).json({ message: "Report job created", jobId });
  } catch (error: any) {
    console.error("[Test] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
