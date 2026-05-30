import { DataTypes, Model } from "sequelize";
import sequelize from "../../../config/db.ts";

export interface WalletAttributes {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  deposit_count: number;
  total_deposit: number;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * A player's money wallet. The game platform owns the balance (source of
 * truth); deposits made here are mirrored to Gamru as a DEPOSIT_MADE event so
 * the CRM can move the player from the "no_deposit" segment to "depositor".
 */
class Wallet extends Model<WalletAttributes> implements WalletAttributes {
  declare id: string;
  declare user_id: string;
  declare balance: number;
  declare currency: string;
  declare deposit_count: number;
  declare total_deposit: number;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Wallet.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    balance: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: "USD",
    },
    deposit_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_deposit: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "Wallet",
    tableName: "wallets",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Wallet;
