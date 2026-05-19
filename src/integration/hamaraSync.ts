import env from "../config/env";
import { logger } from "../utils/logger";

/**
 * Lightweight one-way push of gamification events to hamara-engage-backend.
 *
 * Fire-and-forget: a sync failure must never break gameplay/registration.
 * Idempotency is the receiver's job (gam_xp_transactions UNIQUE event_id),
 * so a duplicate push is harmless.
 */

export type SyncEventType =
  | "USER_REGISTERED"
  | "XP_AWARDED"
  | "LEVEL_UP"
  | "RANK_UP";

export interface HamaraSyncEvent {
  event_id: string;
  event_type: SyncEventType;
  external_id: string;
  email?: string | null;
  amount?: number;
  meta?: Record<string, unknown>;
}

export const syncToHamara = async (
  event: HamaraSyncEvent
): Promise<void> => {
  const url = `${env.hamaraEngage.baseUrl}/integration/events`;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    env.hamaraEngage.timeoutMs
  );

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.hamaraEngage.serviceKey,
      },
      body: JSON.stringify({ origin: "gamify", ...event }),
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn("Hamara sync rejected", {
        event_id: event.event_id,
        type: event.event_type,
        status: res.status,
      });
    }
  } catch (err) {
    logger.error("Hamara sync failed", {
      event_id: event.event_id,
      type: event.event_type,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timer);
  }
};
