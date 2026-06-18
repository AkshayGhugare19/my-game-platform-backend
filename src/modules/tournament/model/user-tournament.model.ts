import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { DataTypes, Model } from "sequelize";
import sequelize from "../../../config/db.ts";

/**
 * A player's participation in a Gamru-authored tournament.
 *
 * Tournaments themselves are owned by Gamru (the backoffice) and fetched
 * live per request; this local row tracks the per-player state Gamru does
 * not store: the running tournament score (drives the leaderboard), how many
 * games the player has played, and a snapshot of the tournament's display
 * fields so the player's HISTORY still renders after a tournament leaves the
 * active catalog.
 */
export class UserTournament extends Model<
  InferAttributes<UserTournament>,
  InferCreationAttributes<UserTournament>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  /** Gamru tournament id (the GamificationEntity uuid). */
  declare tournament_id: string;
  declare registered: CreationOptional<boolean>;
  declare opted_in: CreationOptional<boolean>;
  declare score: CreationOptional<number>;
  /** Number of games the player has played in this tournament. */
  declare plays: CreationOptional<number>;
  /** Per-game play counts: { [gameKey]: count }. */
  declare games_played: CreationOptional<Record<string, number>>;
  /** Snapshot of the tournament's display fields (for history). */
  declare tournament_name: CreationOptional<string | null>;
  declare tournament_industry: CreationOptional<string | null>;
  declare tournament_image: CreationOptional<string | null>;
  declare last_played_at: CreationOptional<Date | null>;
  /** GAMRU marked this player a prize winner (was: local wallet settled). */
  declare prize_awarded: CreationOptional<boolean>;
  /** Prize-pool share GAMRU computed for this player (claimed via GAMRU ledger). */
  declare prize_amount: CreationOptional<number>;
  /** Last leaderboard rank GAMRU reported. */
  declare rank: CreationOptional<number | null>;
  /** REGISTERED | RANKED | WON | CLAIMED (mirrors GAMRU). */
  declare status: CreationOptional<string | null>;
  /** When the player claimed the prize (in GAMRU's reward ledger). */
  declare claimed_at: CreationOptional<Date | null>;
  /** When this cache row was last mirrored from a GAMRU response. */
  declare last_synced_at: CreationOptional<Date | null>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

UserTournament.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    tournament_id: { type: DataTypes.UUID, allowNull: false },
    registered: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    opted_in: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    plays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    games_played: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    tournament_name: { type: DataTypes.STRING(200), allowNull: true },
    tournament_industry: { type: DataTypes.STRING(50), allowNull: true },
    tournament_image: { type: DataTypes.TEXT, allowNull: true },
    last_played_at: { type: DataTypes.DATE, allowNull: true },
    prize_awarded: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    prize_amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    rank: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: true },
    claimed_at: { type: DataTypes.DATE, allowNull: true },
    last_synced_at: { type: DataTypes.DATE, allowNull: true },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "user_tournaments",
    modelName: "UserTournament",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { unique: true, fields: ["user_id", "tournament_id"] },
      { fields: ["tournament_id"] },
    ],
  }
);

export default UserTournament;
