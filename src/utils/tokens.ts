import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import env from "../config/env.ts";

export interface AccessPayload {
  id: string;
  email: string;
  role: string;
}
export interface RefreshPayload {
  id: string;
  tokenId: string;
}

export const signAccessToken = (payload: AccessPayload): string =>
  jwt.sign(payload, env.jwt.accessSecret, {
    algorithm: "HS256",
    expiresIn: env.jwt.accessTtl,
  } as jwt.SignOptions);

export const verifyAccessToken = (token: string): AccessPayload =>
  jwt.verify(token, env.jwt.accessSecret, {
    algorithms: ["HS256"],
  }) as AccessPayload;

/** Creates a rotating refresh token + its db hash + id. */
export const createRefreshToken = (
  userId: string
): { token: string; tokenId: string; hash: string; expiresAt: Date } => {
  const tokenId = uuid();
  const token = jwt.sign({ id: userId, tokenId }, env.jwt.refreshSecret, {
    algorithm: "HS256",
    expiresIn: `${env.jwt.refreshTtlDays}d`,
  } as jwt.SignOptions);
  const expiresAt = new Date(
    Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000
  );
  return { token, tokenId, hash: hashToken(token), expiresAt };
};

export const verifyRefreshToken = (token: string): RefreshPayload =>
  jwt.verify(token, env.jwt.refreshSecret, {
    algorithms: ["HS256"],
  }) as RefreshPayload;

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");
