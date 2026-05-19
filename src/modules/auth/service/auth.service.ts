import bcrypt from "bcryptjs";
import { AppError } from "../../../utils/AppError.ts";
import { decryptPassword } from "../../../utils/passwordCrypto.ts";
import {
  signAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../../../utils/tokens.ts";
import { bus } from "../../../events/eventBus.ts";
import { EVENTS } from "../../../events/events.ts";
import UserRepository from "../../user/model/user.repository.ts";
import RefreshTokenRepository from "../model/refresh-token.repository.ts";
import User from "../../user/model/user.model.ts";
import { seedInitialUserMissions } from "../../mission/service/mission.engine.ts";
import {
  createHamaraEngageUser,
  deriveUsername,
} from "../../../utils/hamaraEngageService.ts";
import { syncToHamara } from "../../../integration/hamaraSync.ts";

interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  password: string;
}
interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

/** Register + atomic gamification onboarding (AUTH-FLOW.md). */
export const registerService = async (input: RegisterInput) => {
  if (await UserRepository.findOne({ email: input.email }))
    throw new AppError("Email already exists", 409);
  if (await UserRepository.findOne({ mobile: input.mobile }))
    throw new AppError("Mobile number already registered", 409);

  const plaintext = decryptPassword(input.password);
  const hash = await bcrypt.hash(plaintext, 12);

  const user = await User.create({
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    mobile: input.mobile,
    password: hash,
    role: "USER",
    status: "ACTIVE",
  });

  bus.emit(EVENTS.USER_REGISTERED, { userId: user.id, email: user.email });

  await createHamaraEngageUser({
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    mobile: input.mobile,
    password: plaintext,
    username: deriveUsername(input.email),
    role: "USER",
    status: "ACTIVE",
  });

  // Link the gamify user to its hamara mirror player (by email) so
  // subsequent XP syncs land on the right profile. Fire-and-forget;
  // runs after the awaited mirror-user creation above so the player
  // already exists for email linking.
  void syncToHamara({
    event_id: `USER_REGISTERED:${user.id}`,
    event_type: "USER_REGISTERED",
    external_id: user.id,
    email: user.email,
  });

  const json = user.toJSON() as Record<string, unknown>;
  delete json.password;
  return json;
};

const issueTokens = async (
  user: User,
  meta: ClientMeta
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  const { token, tokenId, hash, expiresAt } = createRefreshToken(user.id);
  await RefreshTokenRepository.create({
    user_id: user.id,
    token_id: tokenId,
    token_hash: hash,
    expires_at: expiresAt,
    ip: meta.ip ?? null,
    user_agent: meta.userAgent ?? null,
  });
  return { accessToken, refreshToken: token };
};

export const loginService = async (
  email: string,
  password: string,
  meta: ClientMeta
) => {
  const user = await UserRepository.findByEmailWithPassword(email);
  if (!user) throw new AppError("Invalid email or password", 401);
  if (user.status === "INACTIVE")
    throw new AppError("Account is inactive. Please contact support.", 403);

  const match = await bcrypt.compare(
    decryptPassword(password),
    user.password
  );
  if (!match) throw new AppError("Invalid email or password", 401);

  const tokens = await issueTokens(user, meta);
  const json = user.toJSON() as Record<string, unknown>;
  delete json.password;
  return { ...tokens, user: json };
};

/** Rotation + reuse detection (AUTH-FLOW.md). */
export const refreshService = async (
  refreshToken: string,
  meta: ClientMeta
) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid refresh token", 401);
  }

  const row = await RefreshTokenRepository.findByHash(hashToken(refreshToken));
  if (!row) throw new AppError("Invalid refresh token", 401);

  if (row.revoked_at) {
    // Reuse of an already-rotated token → treat as compromise.
    await RefreshTokenRepository.revokeAllForUser(payload.id);
    throw new AppError("Session revoked. Please log in again.", 401);
  }
  if (row.expires_at < new Date())
    throw new AppError("Refresh token expired", 401);

  const user = await UserRepository.findByPk(payload.id);
  if (!user) throw new AppError("User not found", 404);

  const tokens = await issueTokens(user, meta);
  const newHash = hashToken(tokens.refreshToken);
  const newRow = await RefreshTokenRepository.findByHash(newHash);
  await row.update({
    revoked_at: new Date(),
    replaced_by: newRow?.token_id ?? null,
  });

  return tokens;
};

export const logoutService = async (refreshToken: string) => {
  try {
    const row = await RefreshTokenRepository.findByHash(
      hashToken(refreshToken)
    );
    if (row && !row.revoked_at) {
      await row.update({ revoked_at: new Date() });
    }
  } catch {
    /* logout is best-effort */
  }
};

export const resetPasswordService = async (
  email: string,
  _token: string,
  newPassword: string
) => {
  const user = await UserRepository.findOne({ email });
  if (!user) throw new AppError("User not found", 404);
  await user.update({ password: await bcrypt.hash(newPassword, 12) });
  await RefreshTokenRepository.revokeAllForUser(user.id);
  return { email };
};
