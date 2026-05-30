import { randomUUID } from "node:crypto";
import env from "../config/env.ts";
import { logger } from "../utils/logger.ts";

/**
 * Lightweight one-way push of gamification events to gamru-backend.
 *
 * Fire-and-forget: a sync failure must never break gameplay/registration.
 * Idempotency is the receiver's job (gam_xp_transactions UNIQUE event_id),
 * so a duplicate push is harmless.
 */

export type SyncEventType =
  | "USER_REGISTERED"
  | "XP_AWARDED"
  | "LEVEL_UP"
  | "RANK_UP"
  | "DEPOSIT_MADE";

export interface GamruSyncEvent {
  event_id: string;
  event_type: SyncEventType;
  external_id: string;
  email?: string | null;
  amount?: number;
  meta?: Record<string, unknown>;
}

export const syncToGamru = async (event: GamruSyncEvent): Promise<void> => {
  // Hard guard: without the per-client key gamru will 401 us anyway,
  // and the sync is fire-and-forget so the caller never sees a thrown
  // error. Log loudly and bail.
  if (!env.gamru.clientAuthKey) {
    logger.error(
      "syncToGamru skipped — GAMRU_CLIENT_AUTH_KEY is not configured",
      { event_id: event.event_id, type: event.event_type }
    );
    return;
  }

  const url = `${env.gamru.baseUrl}/integration/events`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.gamru.timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.gamru.serviceKey,
        "x-client-auth-key": env.gamru.clientAuthKey,
      },
      body: JSON.stringify({ origin: "gamify", ...event }),
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn("Gamru sync rejected", {
        event_id: event.event_id,
        type: event.event_type,
        status: res.status,
      });
    }
  } catch (err) {
    logger.error("Gamru sync failed", {
      event_id: event.event_id,
      type: event.event_type,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * DEPOSIT_MADE — fire right after a wallet deposit succeeds. Gamru uses it to
 * move the player out of the "no_deposit" segment and into "depositor". Each
 * deposit is a distinct event (random event_id) so repeat deposits all apply.
 */
export const syncDepositMade = (
  externalId: string,
  amount: number,
  email?: string | null,
  meta?: Record<string, unknown>
): void => {
  void syncToGamru({
    event_id: `DEPOSIT_MADE:${externalId}:${randomUUID()}`,
    event_type: "DEPOSIT_MADE",
    external_id: externalId,
    email,
    amount,
    meta,
  });
};
