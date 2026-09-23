import { DataTypes, Model } from "sequelize";
import sequelize from "../../../config/db.ts";

/**
 * Free spins credited to a player — today only granted by a reward-shop
 * purchase whose product is configured with Fulfillment Type = "Free Spins"
 * (see reward-shop.service.ts's buyProduct()). Spent count is tracked via
 * `quantity_remaining`, but nothing in the game engine yet auto-consumes a
 * spin during actual gameplay — this is a visible balance the player (and
 * support) can see, not a wired-up in-game credit. See wallet.service.ts's
 * `getFreeSpinsSummary` for how it's surfaced.
 */
export interface FreeSpinsGrantAttributes {
  id: string;
  user_id: string;
  game_key: string;
  quantity_total: number;
  quantity_remaining: number;
  source: string | null;
  source_id: string | null;
  created_at?: Date;
  updated_at?: Date;
}

class FreeSpinsGrant
  extends Model<FreeSpinsGrantAttributes>
  implements FreeSpinsGrantAttributes
{
  declare id: string;
  declare user_id: string;
  declare game_key: string;
  declare quantity_total: number;
  declare quantity_remaining: number;
  declare source: string | null;
  declare source_id: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

FreeSpinsGrant.init(
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
    game_key: { type: DataTypes.STRING, allowNull: false },
    quantity_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    quantity_remaining: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    source: { type: DataTypes.STRING, allowNull: true },
    source_id: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: "FreeSpinsGrant",
    tableName: "free_spins_grants",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["user_id", "game_key"] }],
  }
);

export default FreeSpinsGrant;
