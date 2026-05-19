import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../../../config/db";

export type MissionType = "DAILY" | "WEEKLY" | "SPECIAL" | "REFERRAL";
export type MissionMetric =
  | "GAMES_PLAYED"
  | "BETS_PLACED"
  | "XP_EARNED"
  | "LOGIN_DAYS"
  | "REFERRALS";

export class Mission extends Model<
  InferAttributes<Mission>,
  InferCreationAttributes<Mission>
> {
  declare id: CreationOptional<string>;
  declare code: string;
  declare title: string;
  declare description: CreationOptional<string>;
  declare type: MissionType;
  declare metric: MissionMetric;
  declare target: number;
  declare reward_xp: CreationOptional<number>;
  declare reward_coins: CreationOptional<number>;
  declare reward_id: CreationOptional<string | null>;
  declare required_rank: CreationOptional<string | null>;
  declare starts_at: CreationOptional<Date | null>;
  declare ends_at: CreationOptional<Date | null>;
  declare active: CreationOptional<boolean>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

Mission.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: false, defaultValue: "" },
    type: {
      type: DataTypes.ENUM("DAILY", "WEEKLY", "SPECIAL", "REFERRAL"),
      allowNull: false,
    },
    metric: {
      type: DataTypes.ENUM(
        "GAMES_PLAYED",
        "BETS_PLACED",
        "XP_EARNED",
        "LOGIN_DAYS",
        "REFERRALS"
      ),
      allowNull: false,
    },
    target: { type: DataTypes.INTEGER, allowNull: false },
    reward_xp: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reward_coins: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reward_id: { type: DataTypes.UUID, allowNull: true },
    required_rank: { type: DataTypes.STRING(20), allowNull: true },
    starts_at: { type: DataTypes.DATE, allowNull: true },
    ends_at: { type: DataTypes.DATE, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "missions",
    modelName: "Mission",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Mission;
