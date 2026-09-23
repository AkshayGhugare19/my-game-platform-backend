import Joi from "joi";

export const recordActivitySchema = Joi.object({
  type: Joi.string()
    .uppercase()
    .valid("GAME_PLAY", "BET_PLACE", "LOGIN")
    .required()
    .messages({ "any.only": "Unsupported activity type" }),
  gameId: Joi.string().optional().allow(null, ""),
  amount: Joi.number().min(0).optional(),
  idempotencyKey: Joi.string().min(6).max(120).required().messages({
    "any.required": "idempotencyKey is required (prevents double-award)",
  }),
  meta: Joi.object().optional(),
  // Optional Challenges/Races passthrough fields — additive only, stored
  // into `meta` and forwarded to gamru's /activity call when present.
  currency: Joi.string().optional(),
  isBonus: Joi.boolean().optional(),
  multiplier: Joi.number().optional(),
  provider: Joi.string().optional(),
  category: Joi.string().optional(),
  roundId: Joi.string().optional(),
  challengeId: Joi.string().optional(),
  raceId: Joi.string().optional(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  unread: Joi.boolean().optional(),
  status: Joi.string().optional(),
});
