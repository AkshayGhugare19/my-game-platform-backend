import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../../../config/db";

export type RankCode =
  | "BEGINNER"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND"
  | "ELITE";

export class RankTier extends Model<
  InferAttributes<RankTier>,
  InferCreationAttributes<RankTier>
> {
  declare code: RankCode;
  declare name: string;
  declare min_level: number;
  declare min_xp: number;
  declare order: number;
  declare icon: CreationOptional<string>;
  declare unlocks: CreationOptional<Record<string, unknown>>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

RankTier.init(
  {
    code: {
      type: DataTypes.ENUM(
        "BEGINNER",
        "BRONZE",
        "SILVER",
        "GOLD",
        "PLATINUM",
        "DIAMOND",
        "ELITE"
      ),
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(50), allowNull: false },
    min_level: { type: DataTypes.INTEGER, allowNull: false },
    min_xp: { type: DataTypes.BIGINT, allowNull: false },
    order: { type: DataTypes.INTEGER, allowNull: false },
    icon: { type: DataTypes.STRING(120), allowNull: false, defaultValue: "" },
    unlocks: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "rank_tiers",
    modelName: "RankTier",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default RankTier;
