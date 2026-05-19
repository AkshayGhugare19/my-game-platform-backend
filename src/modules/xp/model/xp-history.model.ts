import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";

export class XpHistory extends Model<
  InferAttributes<XpHistory>,
  InferCreationAttributes<XpHistory>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare source: "ACTIVITY" | "MISSION" | "STREAK" | "DAILY" | "ADMIN";
  declare rule_code: CreationOptional<string | null>;
  declare xp_amount: number;
  declare balance_after: number;
  declare idempotency_key: CreationOptional<string | null>;
  declare meta: CreationOptional<Record<string, unknown>>;
  declare readonly created_at: CreationOptional<Date>;
}

XpHistory.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    source: {
      type: DataTypes.ENUM("ACTIVITY", "MISSION", "STREAK", "DAILY", "ADMIN"),
      allowNull: false,
    },
    rule_code: { type: DataTypes.STRING(60), allowNull: true },
    xp_amount: { type: DataTypes.INTEGER, allowNull: false },
    balance_after: { type: DataTypes.BIGINT, allowNull: false },
    idempotency_key: { type: DataTypes.STRING(120), allowNull: true, unique: true },
    meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "xp_history",
    modelName: "XpHistory",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["user_id", "created_at"] },
      { unique: true, fields: ["idempotency_key"] },
    ],
  }
);

export default XpHistory;
