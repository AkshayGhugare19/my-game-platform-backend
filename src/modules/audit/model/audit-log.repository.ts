import { BaseRepository } from "../../../core/models/base.repository";
import AuditLog from "./audit-log.model";

class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor() {
    super(AuditLog);
  }
}

export default new AuditLogRepository();
