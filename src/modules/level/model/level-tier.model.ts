import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";

export class LevelTier extends Model<
  InferAttributes<LevelTier>,
  InferCreationAttributes<LevelTier>
> {
  declare level: number;
  declare min_xp: number;
  declare title: CreationOptional<string>;
  declare perks: CreationOptional<Record<string, unknown>>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

LevelTier.init(
  {
    level: { type: DataTypes.INTEGER, primaryKey: true },
    min_xp: { type: DataTypes.BIGINT, allowNull: false },
    title: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "" },
    perks: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "level_tiers",
    modelName: "LevelTier",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default LevelTier;
