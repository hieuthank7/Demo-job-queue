import { Router, Request, Response } from "express";
import { registerUser } from "./auth.service";
import { addJob, flowProducer } from "../../../shared/queue/bullmq-queue";

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
    const { email, name } = req.body;
    if (!email || !name) {
      res.status(400).json({ error: "Email and name are required" });
      return;
    }

    const job = await addJob(
      "email",
      "failing_email",
      { email, name },
      { attempts: 3 },
    );
    const jobId = job.id;

    res.status(201).json({
      message: `Test job created (type: failing_email)`,
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

    const job = await addJob(
      "email",
      "otp_email",
      { email, name, otp: "123456" },
      {
        priority: 1,
      },
    );
    const jobId = job.id;

    res.status(201).json({
      message: "OTP job created with URGENT priority",
      jobId,
      priority: "1",
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

    const { addJob } = await import("../../../shared/queue/bullmq-queue");
    const delay = 10000;
    const job = await addJob(
      "email",
      "reminder_email",
      { email, name },
      {
        delay: delay,
      },
    );
    const jobId = job.id;

    res.status(201).json({
      message: `Reminder scheduled after 10 seconds`,
      jobId,
      scheduled_at: delay.toString(),
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
    const job = await addJob("image", "resize_avatar", {
      imagePath: "/uploads/avatar.jpg",
      width: 200,
      height: 200,
    });
    const jobId = job.id;

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
    const job = await addJob("report", "daily_revenue", {
      reportType: "revenue",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-12",
    });
    const jobId = job.id;

    res.status(201).json({ message: "Report job created", jobId });
  } catch (error: any) {
    console.error("[Test] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * TEST: Create a flow — save user → resize avatar → send welcome email
 * POST /api/auth/register-flow
 */
router.post("/register-flow", async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      res.status(400).json({ error: "Email and name are required" });
      return;
    }

    const flow = await flowProducer.add({
      name: "send_welcome_flow",
      queueName: "email",
      data: { email, name },
      children: [
        {
          name: "save_user",
          queueName: "user",
          data: { email, name },
        },
        {
          name: "resize_avatar",
          queueName: "image",
          data: {
            imagePath: `/uploads/${email}.jpg`,
            width: 200,
            height: 200,
          },
        },
      ],
    });

    res.status(201).json({
      message: "Registration flow created",
      flowId: flow.job.id,
    });
  } catch (error: any) {
    console.error("[Auth] Flow error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
