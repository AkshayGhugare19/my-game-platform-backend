import { randomUUID } from "node:crypto";
import { logger } from "../utils/logger.ts";
import { gamru } from "../utils/gamruService.ts";

/**
 * Lightweight one-way push of gamification events to gamru-backend.
 *
 * Fire-and-forget: a sync failure must never break gameplay/registration.
 * Idempotency is the receiver's job (gam_xp_transactions UNIQUE event_id),
 * so a duplicate push is harmless.
 *
 * Delegates to the typed `gamru.integration.campaigns.trigger` client (which
 * sends the `x-client-auth-key` / `x-service-key` headers, applies the gamru
 * timeout, and never throws) so this push and the campaign trigger share one
 * code path — see `POST /integration/events`.
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
  // The typed client guards the missing-key case, applies the timeout and
  // returns `ok:false` instead of throwing, so this stays fire-and-forget.
  const res = await gamru.integration.campaigns.trigger(event);
  if (!res.ok) {
    logger.warn("Gamru sync rejected", {
      event_id: event.event_id,
      type: event.event_type,
      status: res.status,
      error: res.error,
    });
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
