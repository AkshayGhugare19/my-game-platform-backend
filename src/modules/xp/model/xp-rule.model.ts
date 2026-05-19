import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";

export class XpRule extends Model<
  InferAttributes<XpRule>,
  InferCreationAttributes<XpRule>
> {
  declare id: CreationOptional<string>;
  declare code: string;
  declare description: CreationOptional<string>;
  declare xp_amount: number;
  declare per: CreationOptional<string>;
  declare daily_cap: CreationOptional<number | null>;
  declare active: CreationOptional<boolean>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

XpRule.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
    xp_amount: { type: DataTypes.INTEGER, allowNull: false },
    per: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "event" },
    daily_cap: { type: DataTypes.INTEGER, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "xp_rules",
    modelName: "XpRule",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default XpRule;
