import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";

export type UserMissionStatus =
  | "LOCKED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLAIMED"
  | "EXPIRED";

export class UserMission extends Model<
  InferAttributes<UserMission>,
  InferCreationAttributes<UserMission>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare mission_id: string;
  declare progress: CreationOptional<number>;
  declare target: number;
  declare status: CreationOptional<UserMissionStatus>;
  declare period_key: string;
  declare completed_at: CreationOptional<Date | null>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

UserMission.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    mission_id: { type: DataTypes.UUID, allowNull: false },
    progress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    target: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "LOCKED",
        "IN_PROGRESS",
        "COMPLETED",
        "CLAIMED",
        "EXPIRED"
      ),
      allowNull: false,
      defaultValue: "IN_PROGRESS",
    },
    period_key: { type: DataTypes.STRING(20), allowNull: false },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "user_missions",
    modelName: "UserMission",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { unique: true, fields: ["user_id", "mission_id", "period_key"] },
      { fields: ["status"] },
    ],
  }
);

export default UserMission;
