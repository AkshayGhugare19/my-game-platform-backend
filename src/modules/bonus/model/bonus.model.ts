import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";

/** RM = Real Money, BM = Bonus Money — which wallet bucket a claim credits. */
export type AmountType = "RM" | "BM";
export type BonusStatus = "ACTIVE" | "INACTIVE";

/**
 * A bonus DEFINITION authored on the games platform (the catalog). Operators
 * paste a bonus `id` into a GAMRU rank/level so reaching it grants the bonus.
 * `bonus_type` is an extensible string (BONUS_CASH, FREE_SPIN, …), not an ENUM.
 */
export class Bonus extends Model<
  InferAttributes<Bonus>,
  InferCreationAttributes<Bonus>
> {
  declare id: CreationOptional<string>;
  declare bonus_name: string;
  declare bonus_type: CreationOptional<string>;
  declare amount: number;
  declare amount_type: AmountType;
  declare status: CreationOptional<BonusStatus>;
  declare description: CreationOptional<string>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

Bonus.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    bonus_name: { type: DataTypes.STRING(150), allowNull: false },
    bonus_type: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "BONUS_CASH",
    },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    amount_type: { type: DataTypes.ENUM("RM", "BM"), allowNull: false },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    description: { type: DataTypes.STRING(500), allowNull: false, defaultValue: "" },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "bonuses",
    modelName: "Bonus",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Bonus;
