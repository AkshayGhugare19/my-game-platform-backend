import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";

export type NotificationType =
  | "LEVEL_UP"
  | "RANK_UP"
  | "REWARD_UNLOCKED"
  | "MISSION_COMPLETED"
  | "STREAK"
  | "SYSTEM";

export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare type: NotificationType;
  declare title: string;
  declare body: CreationOptional<string>;
  declare data: CreationOptional<Record<string, unknown>>;
  declare read_at: CreationOptional<Date | null>;
  declare readonly created_at: CreationOptional<Date>;
}

Notification.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    type: {
      type: DataTypes.ENUM(
        "LEVEL_UP",
        "RANK_UP",
        "REWARD_UNLOCKED",
        "MISSION_COMPLETED",
        "STREAK",
        "SYSTEM"
      ),
      allowNull: false,
    },
    title: { type: DataTypes.STRING(150), allowNull: false },
    body: { type: DataTypes.STRING(500), allowNull: false, defaultValue: "" },
    data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    read_at: { type: DataTypes.DATE, allowNull: true },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "notifications",
    modelName: "Notification",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["user_id", "read_at", "created_at"] }],
  }
);

export default Notification;
