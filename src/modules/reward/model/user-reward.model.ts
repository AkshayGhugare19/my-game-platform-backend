import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../../../config/db.ts";

export type UserRewardStatus =
  | "GRANTED"
  | "CLAIMED"
  | "EXPIRED"
  | "REVOKED";

export class UserReward extends Model<
  InferAttributes<UserReward>,
  InferCreationAttributes<UserReward>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare reward_id: string;
  declare source: "RANK" | "MISSION" | "LEVEL" | "ADMIN" | "SHOP";
  declare status: CreationOptional<UserRewardStatus>;
  declare granted_at: CreationOptional<Date>;
  declare claimed_at: CreationOptional<Date | null>;
  declare expires_at: CreationOptional<Date | null>;
  declare meta: CreationOptional<Record<string, unknown>>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

UserReward.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    reward_id: { type: DataTypes.UUID, allowNull: false },
    source: {
      type: DataTypes.ENUM("RANK", "MISSION", "LEVEL", "ADMIN", "SHOP"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("GRANTED", "CLAIMED", "EXPIRED", "REVOKED"),
      allowNull: false,
      defaultValue: "GRANTED",
    },
    granted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    claimed_at: { type: DataTypes.DATE, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
    meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "user_rewards",
    modelName: "UserReward",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id", "status"] },
      { fields: ["expires_at"] },
    ],
  }
);

export default UserReward;
