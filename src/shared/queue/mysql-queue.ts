import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "../database";
import { AddJobOptions, Job, JobStatus } from "./queue.types";

// ==================== PRODUCER ====================

/**
 * Add a new job to the queue
 * Called by: API server
 */
export async function addJob(options: AddJobOptions): Promise<number> {
  const {
    queue,
    type,
    payload,
    priority = 0,
    max_attempts = 3,
    scheduled_at,
  } = options;

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO jobs (queue, type, payload, priority, max_attempts, scheduled_at) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      queue,
      type,
      JSON.stringify(payload),
      priority,
      max_attempts,
      scheduled_at || new Date(),
    ],
  );

  console.log(
    `[Queue] Job #${result.insertId} added → queue="${queue}", type="${type}", priority=${priority}`,
  );
  return result.insertId;
}

// ==================== CONSUMER ====================

/**
 * Fetch the next available job from the queue for processing
 * Called by: Worker
 *
 * FOR UPDATE SKIP LOCKED:
 * - FOR UPDATE: locks the selected row, preventing other workers from claiming it
 * - SKIP LOCKED: if a row is already locked, skip it and pick the next one
 * -> Multiple workers can run in parallel without ever processing the same job
 */
export async function getNextJob(
  queue: string,
  workerId: string,
): Promise<Job | null> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Find the next pending job (with row lock)
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM jobs 
       WHERE status = ? 
         AND queue = ? 
         AND scheduled_at <= NOW()
       ORDER BY priority DESC, id ASC
       LIMIT 1 
       FOR UPDATE SKIP LOCKED`,
      [JobStatus.PENDING, queue],
    );

    // No pending jobs found -> rollback and exit
    if (rows.length === 0) {
      await connection.rollback();
      return null;
    }

    const job = rows[0] as Job;

    // 2. Mark the job as processing
    await connection.execute(
      `UPDATE jobs SET 
         status = ?, 
         started_at = NOW(), 
         worker_id = ?,
         attempts = attempts + 1
       WHERE id = ?`,
      [JobStatus.PROCESSING, workerId, job.id],
    );

    await connection.commit();

    // Parse payload from string to object
    return {
      ...job,
      payload:
        typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release(); // MUST return connection to pool!
  }
}

// ==================== JOB COMPLETION ====================

/**
 * Calculate retry delay using exponential backoff
 * Attempt 1: 30s, Attempt 2: 120s (2m), Attempt 3: 480s (8m), Attempt 4: 1800s (30m)
 * Capped at 1 hour to prevent excessive wait times
 */
function getRetryDelay(attempt: number): number {
  return Math.min(30 * Math.pow(4, attempt - 1), 3600);
}

/**
 * Mark a job as completed
 */
export async function completeJob(jobId: number): Promise<void> {
  await pool.execute(
    `UPDATE jobs SET status = ?, completed_at = NOW() WHERE id = ?`,
    [JobStatus.COMPLETED, jobId],
  );
  console.log(`[Queue] Job #${jobId} completed ✓`);
}

/**
 * Mark a job as failed, with automatic retry or dead letter
 */
export async function failJob(jobId: number, reason: string): Promise<void> {
  // Get current attempts info for the job
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT attempts, max_attempts FROM jobs WHERE id = ?",
    [jobId],
  );

  if (rows.length === 0) {
    console.warn(`[Queue] failJob: Job #${jobId} not found`);
    return;
  }

  const { attempts, max_attempts } = rows[0];

  if (attempts < max_attempts) {
    // Retries remaining -> reschedule with delay
    const delay = getRetryDelay(attempts);
    await pool.execute(
      `UPDATE jobs SET 
         status = ?, 
         failed_reason = ?,
         scheduled_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
       WHERE id = ?`,
      [JobStatus.PENDING, reason, delay, jobId],
    );
    console.log(
      `[Queue] Job #${jobId} failed — retry in ${delay}s ` +
        `(attempt ${attempts}/${max_attempts}) — ${reason}`,
    );
  } else {
    // No retries left -> DEAD
    await pool.execute(
      `UPDATE jobs SET status = ?, failed_reason = ? WHERE id = ?`,
      [JobStatus.DEAD, reason, jobId],
    );
    console.log(
      `[Queue] Job #${jobId} DEAD — exhausted ${max_attempts} attempts — ${reason}`,
    );
  }
}

// ==================== ADMIN ====================

/**
 * Get list of dead jobs — for admin to review and manually retry
 */
export async function getDeadJobs(): Promise<Job[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM jobs WHERE status = ? ORDER BY updated_at DESC`,
    [JobStatus.DEAD],
  );

  return rows.map((row) => ({
    ...row,
    payload:
      typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
  })) as Job[];
}

/**
 * Retry a dead job — admin manually triggers retry
 * Resets attempts to 0, status to pending, worker will pick it up immediately
 */
export async function retryDeadJob(jobId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE jobs SET 
       status = ?, 
       attempts = 0, 
       failed_reason = NULL,
       scheduled_at = NOW()
     WHERE id = ? AND status = ?`,
    [JobStatus.PENDING, jobId, JobStatus.DEAD],
  );

  // affectedRows = 0 -> job not found or not in dead status
  return result.affectedRows > 0;
}

/**
 * Get job count statistics grouped by queue and status
 * Used for admin monitoring
 */
export async function getQueueStats(): Promise<
  Record<string, Record<string, number>>
> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT queue, status, COUNT(*) as count 
     FROM jobs 
     GROUP BY queue, status`,
  );

  // Transform flat rows into nested object
  // { email: { pending: 5, completed: 10 }, image: { pending: 2 } }
  const stats: Record<string, Record<string, number>> = {};

  for (const row of rows) {
    if (!stats[row.queue]) {
      stats[row.queue] = {};
    }
    stats[row.queue][row.status] = row.count;
  }

  return stats;
}

/**
 * Find and reset jobs stuck in 'processing' state for too long
 * Jobs processing longer than staleMinutes -> reset to pending for another worker to pick up
 */
export async function resetStaleJobs(
  staleMinutes: number = 10,
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE jobs SET 
       status = ?, 
       worker_id = NULL,
       failed_reason = CONCAT(IFNULL(failed_reason, ''), ' | Stale: reset after ', ?, ' minutes')
     WHERE status = ? 
       AND started_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [JobStatus.PENDING, staleMinutes, JobStatus.PROCESSING, staleMinutes],
  );

  if (result.affectedRows > 0) {
    console.log(
      `[Queue] Reset ${result.affectedRows} stale jobs (processing > ${staleMinutes}m)`,
    );
  }

  return result.affectedRows;
}
