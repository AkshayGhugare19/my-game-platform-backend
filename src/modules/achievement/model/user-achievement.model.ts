import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional} from "sequelize";
import {
  DataTypes,
  Model
} from "sequelize";
import sequelize from "../../../config/db.ts";

export class UserAchievement extends Model<
  InferAttributes<UserAchievement>,
  InferCreationAttributes<UserAchievement>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare achievement_id: string;
  declare unlocked_at: CreationOptional<Date>;
  declare readonly created_at: CreationOptional<Date>;
}

UserAchievement.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    achievement_id: { type: DataTypes.UUID, allowNull: false },
    unlocked_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "user_achievements",
    modelName: "UserAchievement",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ unique: true, fields: ["user_id", "achievement_id"] }],
  }
);

export default UserAchievement;
