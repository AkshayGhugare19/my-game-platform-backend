import { BaseRepository } from "../../../core/models/base.repository.ts";
import AuditLog from "./audit-log.model.ts";

class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor() {
    super(AuditLog);
  }
}

export default new AuditLogRepository();
