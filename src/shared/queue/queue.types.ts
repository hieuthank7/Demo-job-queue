export enum JobStatus {
  PENDING = "pending", // newly created, waiting to be processed
  PROCESSING = "processing", // worker is currently processing
  COMPLETED = "completed", // successfully processed
  FAILED = "failed", // failed, can be retried
  DEAD = "dead", // exhausted all retries
}

// Shape of a job row in the database
export interface Job {
  id: number;
  queue: string;
  type: string;
  payload: Record<string, any>; // arbitrary JSON object
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  scheduled_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  failed_reason: string | null;
  worker_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// Only these fields are required when creating a new job
export interface AddJobOptions {
  queue: string; // queue name: 'email', 'image'...
  type: string; // job type: 'welcome_email', 'otp'...
  payload: Record<string, any>;
  priority?: number;
  max_attempts?: number; // optional, default 3
  scheduled_at?: Date; // optional, default NOW (run immediately)
}

export enum JobPriority {
  NORMAL = 0,
  HIGH = 1,
  URGENT = 2,
}
