import { DataTypes, Model } from "sequelize";
import sequelize from "../../../config/db.ts";

export type RewardPurchaseCategory = "product" | "booster";
export type RewardPurchaseStatus = "ACTIVE" | "EXPIRED" | "COMPLETED";

/**
 * Local record of a reward-shop purchase. Tokens are spent and validated
 * on gamru (the source of truth); this row exists only to render the
 * player's rich "Shop History" and "My Boosters" tabs (image, category,
 * multiplier, expiry) which the lean gamru `player_rewards` row can't hold,
 * and to drive the live booster multiplier on XP earning.
 */
export interface RewardPurchaseAttributes {
  id: string;
  user_id: string;
  /** gamru reward_shop entity id. */
  product_id: string;
  product_name: string;
  image: string | null;
  category: RewardPurchaseCategory;
  tier: string | null;
  token_cost: number;
  quantity: number;
  /** Booster-only fields (null for ordinary products). */
  multiplier: number | null;
  booster_kind: string | null;
  duration_minutes: number | null;
  expires_at: Date | null;
  status: RewardPurchaseStatus;
  created_at?: Date;
  updated_at?: Date;
}

class RewardPurchase
  extends Model<RewardPurchaseAttributes>
  implements RewardPurchaseAttributes
{
  declare id: string;
  declare user_id: string;
  declare product_id: string;
  declare product_name: string;
  declare image: string | null;
  declare category: RewardPurchaseCategory;
  declare tier: string | null;
  declare token_cost: number;
  declare quantity: number;
  declare multiplier: number | null;
  declare booster_kind: string | null;
  declare duration_minutes: number | null;
  declare expires_at: Date | null;
  declare status: RewardPurchaseStatus;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

RewardPurchase.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    product_id: { type: DataTypes.STRING, allowNull: false },
    product_name: { type: DataTypes.STRING, allowNull: false },
    image: { type: DataTypes.TEXT, allowNull: true },
    category: {
      type: DataTypes.ENUM("product", "booster"),
      allowNull: false,
      defaultValue: "product",
    },
    tier: { type: DataTypes.STRING, allowNull: true },
    token_cost: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    multiplier: { type: DataTypes.FLOAT, allowNull: true },
    booster_kind: { type: DataTypes.STRING, allowNull: true },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM("ACTIVE", "EXPIRED", "COMPLETED"),
      allowNull: false,
      defaultValue: "COMPLETED",
    },
  },
  {
    sequelize,
    modelName: "RewardPurchase",
    tableName: "reward_purchases",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id", "status"] },
      { fields: ["user_id", "category"] },
      { fields: ["expires_at"] },
    ],
  }
);

export default RewardPurchase;
