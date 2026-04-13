import { Job } from "../../../shared/queue/queue.types";

/**
 * Handle image-related jobs (resize, compress, watermark...)
 * Simulated with delay, in production use sharp/jimp
 */
export async function handleImageJob(job: Job): Promise<void> {
  const { imagePath, width, height } = job.payload;

  switch (job.type) {
    case "resize_avatar":
      console.log(
        `[Image] Resizing avatar: ${imagePath} → ${width}x${height}...`,
      );
      await delay(3000); // simulate resize taking 3 seconds (CPU-heavy)
      console.log(`[Image] Avatar resized ✓`);
      break;

    case "compress_image":
      console.log(`[Image] Compressing: ${imagePath}...`);
      await delay(4000); // simulate compress taking 4 seconds
      console.log(`[Image] Image compressed ✓`);
      break;

    default:
      throw new Error(`Unknown image job type: ${job.type}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
