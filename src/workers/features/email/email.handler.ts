import { Job } from "bullmq";

/**
 * Handle email-related jobs
 */
export async function handleEmailJob(job: Job): Promise<void> {
  const { email, name } = job.data;

  switch (job.name) {
    case "welcome_email":
      // Simulate sending a normal email (takes 2 seconds)
      console.log(`[Email] Sending welcome email to ${email}...`);
      await delay(2000);
      console.log(`[Email] Welcome email sent to ${name} <${email}> ✓`);
      break;

    case "failing_email":
      // Simulate email that always fails → used to test retry mechanism
      console.log(`[Email] Attempting to send failing email to ${email}...`);
      await delay(500);
      throw new Error("Simulated SendGrid timeout");

    case "flaky_email":
      // Simulate email that fails 50% of the time → sometimes succeeds, sometimes fails
      console.log(`[Email] Attempting to send flaky email to ${email}...`);
      await delay(500);
      if (Math.random() < 0.5) {
        throw new Error("Simulated random network error");
      }
      console.log(`[Email] Flaky email sent to ${name} <${email}> ✓`);
      break;

    case "otp_email":
      // OTP needs to be sent fast, user is waiting
      console.log(`[Email] Sending OTP to ${email}...`);
      await delay(500);
      console.log(`[Email] OTP sent to ${name} <${email}> ✓`);
      break;

    case "reminder_email":
      // Reminder to verify email (delayed job, sent after 24h)
      console.log(`[Email] Sending reminder to ${email}...`);
      await delay(1000);
      console.log(`[Email] Reminder sent to ${name} <${email}> ✓`);
      break;

    case "send_welcome_flow":
      // Read values from child jobs (save_user, resize_avatar)
      const childrenValues = await job.getChildrenValues();
      console.log(`[Email] Children values:`, childrenValues);

      // Find the user data from save_user child
      const userData = Object.values(childrenValues).find(
        (v: any) => v?.userId,
      ) as any;

      console.log(
        `[Email] Sending welcome email to ${userData.email} (user #${userData.userId})...`,
      );
      await delay(1500);
      console.log(`[Email] Welcome email sent ✓`);
      break;

    default:
      throw new Error(`Unknown email job type: ${job.name}`);
  }
}

// Simulate email sending time
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
