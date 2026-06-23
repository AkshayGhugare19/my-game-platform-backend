import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";
import type { AmountType } from "./bonus.model.ts";

export type UserBonusSource = "LEVEL" | "RANK";
export type UserBonusStatus = "PENDING" | "CLAIMED" | "EXPIRED";

/**
 * A bonus GRANTED to a player because they reached the GAMRU level/rank it was
 * pinned to (the ledger). PENDING until the player claims it, then CLAIMED with
 * the wallet credited (RM→real_money, BM→bonus_money). The unique composite
 * index `(user_id, bonus_id, source_type, source_id)` is the duplicate-grant
 * guard — reconcile runs on every profile read, so it must be idempotent.
 */
export class UserBonus extends Model<
  InferAttributes<UserBonus>,
  InferCreationAttributes<UserBonus>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare bonus_id: string;
  declare source_type: UserBonusSource;
  declare source_id: string;
  declare amount: number;
  declare amount_type: AmountType;
  declare status: CreationOptional<UserBonusStatus>;
  declare claimed_at: CreationOptional<Date | null>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

UserBonus.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    bonus_id: { type: DataTypes.UUID, allowNull: false },
    source_type: { type: DataTypes.ENUM("LEVEL", "RANK"), allowNull: false },
    source_id: { type: DataTypes.STRING(64), allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    amount_type: { type: DataTypes.ENUM("RM", "BM"), allowNull: false },
    status: {
      type: DataTypes.ENUM("PENDING", "CLAIMED", "EXPIRED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    claimed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "user_bonuses",
    modelName: "UserBonus",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        name: "user_bonuses_grant_unique",
        fields: ["user_id", "bonus_id", "source_type", "source_id"],
      },
      { fields: ["user_id", "status"] },
    ],
  }
);

export default UserBonus;
