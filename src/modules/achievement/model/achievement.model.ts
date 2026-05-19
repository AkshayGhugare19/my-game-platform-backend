import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";

export class Achievement extends Model<
  InferAttributes<Achievement>,
  InferCreationAttributes<Achievement>
> {
  declare id: CreationOptional<string>;
  declare code: string;
  declare name: string;
  declare description: CreationOptional<string>;
  declare icon: CreationOptional<string>;
  declare criteria: CreationOptional<Record<string, unknown>>;
  declare active: CreationOptional<boolean>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

Achievement.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.STRING(300), allowNull: false, defaultValue: "" },
    icon: { type: DataTypes.STRING(120), allowNull: false, defaultValue: "" },
    criteria: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "achievements",
    modelName: "Achievement",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Achievement;
