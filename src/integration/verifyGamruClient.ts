import env from "../config/env.ts";
import {
  request as gamruRequest,
  setGamruClientStatus,
} from "../utils/gamruService.ts";
import { logger } from "../utils/logger.ts";

interface GamruClientMe {
  id: string;
  name: string;
  slug: string;
  skin_id: string;
  status: "ENABLED" | "DISABLED";
}

/**
 * Boot-time sanity check: ping gamru's `/clients/me` with the configured
 * `GAMRU_CLIENT_AUTH_KEY`. We log a clear warning (not crash) so the game
 * platform still boots if gamru is briefly down — but operators see at
 * once when their client config is wrong.
 *
 *   ok      → log identity (name, slug, skin)
 *   401/403 → log "key missing/invalid/disabled"
 *   other   → log "gamru unreachable" (likely transient)
 */
export const verifyGamruClient = async (): Promise<void> => {
  if (!env.gamru.clientAuthKey) {
    logger.warn(
      "GAMRU_CLIENT_AUTH_KEY not set — outbound calls to gamru will be rejected by clientAuth"
    );
    return;
  }

  const res = await gamruRequest<{ data?: GamruClientMe }>(
    "GET",
    "/clients/me"
  );

  if (res.ok) {
    const body = res.body as { data?: GamruClientMe } | undefined;
    const me = body?.data;
    if (me) {
      // A successful /clients/me means the key was accepted. gamru's
      // clientAuth middleware would have already rejected with 403 if
      // the row was DISABLED, but echo the resolved status anyway so a
      // future change in gamru's response semantics is handled.
      if (me.status === "DISABLED") {
        setGamruClientStatus("DISABLED");
        logger.error(
          `❌ Gamru client "${me.name}" (slug=${me.slug}) is DISABLED — all gamru calls will be rejected until it is re-enabled from Configurations → Clients`
        );
      } else {
        setGamruClientStatus("ENABLED");
        logger.info(
          `✅ Gamru client identified: ${me.name} (slug=${me.slug}, skin_id=${me.skin_id}, status=${me.status})`
        );
      }
    } else {
      logger.warn("Gamru /clients/me returned ok but with no data");
    }
    return;
  }

  // `request()` already updates the status cache on 401/403, but be
  // explicit here so the boot log is the single source of truth.
  if (res.status === 401) {
    setGamruClientStatus("INVALID_KEY");
    logger.error(
      "❌ Gamru rejected GAMRU_CLIENT_AUTH_KEY (401) — key is missing or unknown. All gamru calls will return an error until a valid key is configured."
    );
  } else if (res.status === 403) {
    setGamruClientStatus("DISABLED");
    logger.error(
      "❌ Gamru client service is disabled (403) — enable it from Configurations → Clients. All gamru calls will return an error until then."
    );
  } else {
    // Network error / 5xx / timeout — leave status as UNKNOWN so we
    // optimistically retry; the per-request handler will mark
    // DISABLED/INVALID_KEY if a real auth rejection comes back later.
    logger.warn(
      `Gamru /clients/me check failed (status=${res.status ?? "n/a"}, error=${
        res.error ?? "n/a"
      }) — continuing boot, status left UNKNOWN`
    );
  }
};
