import { logger } from "../utils/logger";
import { expirySweep } from "../modules/reward/service/reward.engine";

/**
 * Lightweight in-process scheduler (single instance). For horizontal
 * scaling, move these to a dedicated worker so they don't double-run.
 */
const HOUR = 60 * 60 * 1000;

export const startCronJobs = (): void => {
  // Reward expiry sweep — hourly.
  setInterval(() => {
    void (async () => {
      try {
        const n = await expirySweep();
        if (n) logger.info("reward expiry sweep", { expired: n });
      } catch (e) {
        logger.error("reward expiry sweep failed", {
          error: (e as Error).message,
        });
      }
    })();
  }, HOUR);

  logger.info("✅ Cron jobs scheduled");
};
