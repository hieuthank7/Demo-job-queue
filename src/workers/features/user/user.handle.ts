import { Job } from "bullmq";

/**
 * Handle user-related jobs (save user to DB)
 * Simulated with delay — in production this would write to MySQL
 */
export async function handleUserJob(job: Job): Promise<void> {
  const { email, name } = job.data;

  switch (job.name) {
    case "save_user":
      console.log(`[User] Saving user ${name} <${email}> to database...`);
      await delay(1000);
      const userId = Math.floor(Math.random() * 10000);
      console.log(`[User] User saved (id: ${userId}) ✓`);

      // Return value — parent job can read this via getChildrenValues()
      return { userId, email, name } as any;

    default:
      throw new Error(`Unknown user job type: ${job.name}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
