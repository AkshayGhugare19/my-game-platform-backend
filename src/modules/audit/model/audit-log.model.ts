import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../../../config/db.ts";

export class AuditLog extends Model<
  InferAttributes<AuditLog>,
  InferCreationAttributes<AuditLog>
> {
  declare id: CreationOptional<string>;
  declare actor_id: CreationOptional<string | null>;
  declare action: string;
  declare entity: string;
  declare entity_id: CreationOptional<string>;
  declare ip: CreationOptional<string | null>;
  declare user_agent: CreationOptional<string | null>;
  declare before: CreationOptional<Record<string, unknown> | null>;
  declare after: CreationOptional<Record<string, unknown> | null>;
  declare readonly created_at: CreationOptional<Date>;
}

AuditLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    actor_id: { type: DataTypes.UUID, allowNull: true },
    action: { type: DataTypes.STRING(80), allowNull: false },
    entity: { type: DataTypes.STRING(80), allowNull: false },
    entity_id: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "" },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    user_agent: { type: DataTypes.STRING(255), allowNull: true },
    before: { type: DataTypes.JSONB, allowNull: true },
    after: { type: DataTypes.JSONB, allowNull: true },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "audit_logs",
    modelName: "AuditLog",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["actor_id", "created_at"] }, { fields: ["entity"] }],
  }
);

export default AuditLog;
