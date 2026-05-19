import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../../../config/db.ts";

/**
 * The XP ingestion point. `meta` may carry outcome (win/loss/payout) for
 * analytics, but the XP engine MUST NOT read it — XP = participation only.
 */
export class ActivityLog extends Model<
  InferAttributes<ActivityLog>,
  InferCreationAttributes<ActivityLog>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare type: string;
  declare game_id: CreationOptional<string | null>;
  declare amount: CreationOptional<number | null>;
  declare idempotency_key: string;
  declare processed: CreationOptional<boolean>;
  declare meta: CreationOptional<Record<string, unknown>>;
  declare readonly created_at: CreationOptional<Date>;
}

ActivityLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING(40), allowNull: false },
    game_id: { type: DataTypes.STRING(80), allowNull: true },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    idempotency_key: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },
    processed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "activity_logs",
    modelName: "ActivityLog",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["user_id", "created_at"] },
      { unique: true, fields: ["idempotency_key"] },
    ],
  }
);

export default ActivityLog;
