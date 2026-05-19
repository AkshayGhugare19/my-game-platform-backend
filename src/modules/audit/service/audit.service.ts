import AuditLogRepository from "../model/audit-log.repository.ts";
import { logger } from "../../../utils/logger.ts";

interface AuditInput {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  ip?: string;
  userAgent?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/** Fire-and-forget: auditing must never break the audited request. */
export const recordAudit = async (input: AuditInput): Promise<void> => {
  try {
    await AuditLogRepository.create({
      actor_id: input.actorId,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId,
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      before: input.before ?? null,
      after: sanitize(input.after),
    });
  } catch (e) {
    logger.error("audit write failed", { error: (e as Error).message });
  }
};

/** Never persist secrets in the audit trail. */
const sanitize = (
  o?: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (!o) return null;
  const clone = { ...o };
  for (const k of ["password", "new_password", "refreshToken", "token"])
    if (k in clone) clone[k] = "***";
  return clone;
};
