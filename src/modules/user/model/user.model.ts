import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare first_name: string;
  declare last_name: string;
  declare username: CreationOptional<string | null>;
  declare email: string;
  declare mobile: string;
  declare password: string;
  declare role: CreationOptional<"USER" | "ADMIN">;
  declare status: CreationOptional<"ACTIVE" | "INACTIVE">;
  declare timezone: CreationOptional<string>;
  declare two_factor_enabled: CreationOptional<boolean>;
  declare theme: CreationOptional<string>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    username: { type: DataTypes.STRING(100), unique: true, allowNull: true },
    email: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      validate: { isEmail: true },
    },
    mobile: { type: DataTypes.STRING(20), unique: true, allowNull: false },
    password: { type: DataTypes.TEXT, allowNull: false },
    role: { type: DataTypes.ENUM("USER", "ADMIN"), defaultValue: "USER" },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      defaultValue: "ACTIVE",
    },
    timezone: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "UTC",
    },
    two_factor_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    theme: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "dark",
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "users",
    modelName: "User",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    defaultScope: { attributes: { exclude: ["password"] } },
    scopes: { withPassword: { attributes: { exclude: [] } } },
  }
);

export default User;
