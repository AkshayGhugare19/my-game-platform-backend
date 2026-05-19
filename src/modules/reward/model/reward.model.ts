import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";

export type RewardType =
  | "COINS"
  | "COUPON"
  | "BONUS_POINTS"
  | "UNLOCKABLE"
  | "BADGE"
  | "FEATURE_ACCESS";

export class Reward extends Model<
  InferAttributes<Reward>,
  InferCreationAttributes<Reward>
> {
  declare id: CreationOptional<string>;
  declare code: string;
  declare name: string;
  declare type: RewardType;
  declare value: CreationOptional<Record<string, unknown>>;
  declare required_rank: CreationOptional<string | null>;
  declare required_level: CreationOptional<number | null>;
  declare cost_coins: CreationOptional<number | null>;
  declare stock: CreationOptional<number | null>;
  declare expires_in_days: CreationOptional<number | null>;
  declare active: CreationOptional<boolean>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

Reward.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    type: {
      type: DataTypes.ENUM(
        "COINS",
        "COUPON",
        "BONUS_POINTS",
        "UNLOCKABLE",
        "BADGE",
        "FEATURE_ACCESS"
      ),
      allowNull: false,
    },
    value: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    required_rank: { type: DataTypes.STRING(20), allowNull: true },
    required_level: { type: DataTypes.INTEGER, allowNull: true },
    cost_coins: { type: DataTypes.INTEGER, allowNull: true },
    stock: { type: DataTypes.INTEGER, allowNull: true },
    expires_in_days: { type: DataTypes.INTEGER, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "rewards",
    modelName: "Reward",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Reward;
