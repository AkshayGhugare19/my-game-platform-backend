/**
 * Gamru-backed challenge service — THIN CONSUMER.
 *
 * GAMRU is the single source of truth for Challenges: it authors the
 * definitions AND computes all per-player progress (join, progress, complete,
 * claim, cancel) via the `/api/challenges/*` integration API. Mirrors
 * `mission.engine.ts`'s "thin proxy" role, minus the local cache mirror —
 * Challenges are a new feature with no local `user_challenges` table, so
 * every call forwards straight through and returns GAMRU's response as-is.
 */
import { AppError } from "../../../utils/AppError.ts";
import gamru, {
  type GamruIntChallenge,
  type GamruIntChallengeProgress,
} from "../../../utils/gamruService.ts";

export type ChallengeDTO = GamruIntChallenge;

export const listChallenges = async (
  email: string
): Promise<ChallengeDTO[]> => {
  const res = await gamru.integration.challenges.list(email);
  if (!res.ok || !res.body) {
    throw new AppError(
      res.error || "Failed to load challenges",
      res.status ?? 502
    );
  }
  return res.body.challenges;
};

export const getChallenge = async (
  email: string,
  challengeId: string
): Promise<ChallengeDTO> => {
  const res = await gamru.integration.challenges.get(challengeId, email);
  if (!res.ok || !res.body) {
    throw new AppError(res.error || "Challenge not found", res.status ?? 404);
  }
  return res.body;
};

export const joinChallenge = async (
  userId: string,
  email: string,
  challengeId: string
): Promise<ChallengeDTO> => {
  const res = await gamru.integration.challenges.join(
    challengeId,
    email,
    userId
  );
  if (!res.ok || !res.body) {
    throw new AppError(
      res.error || "Failed to join challenge",
      res.status ?? 502
    );
  }
  return res.body;
};

export const cancelChallenge = async (
  email: string,
  challengeId: string
): Promise<void> => {
  const res = await gamru.integration.challenges.cancel(challengeId, email);
  if (!res.ok) {
    throw new AppError(
      res.error || "Failed to cancel challenge",
      res.status ?? 502
    );
  }
};

export const getChallengeProgress = async (
  email: string,
  challengeId: string
): Promise<GamruIntChallengeProgress> => {
  const res = await gamru.integration.challenges.progress(
    challengeId,
    email
  );
  if (!res.ok || !res.body) {
    throw new AppError(
      res.error || "Failed to load challenge progress",
      res.status ?? 502
    );
  }
  return res.body;
};

export const claimChallenge = async (
  email: string,
  challengeId: string
): Promise<{ reward_label: string }> => {
  const res = await gamru.integration.challenges.claim(challengeId, email);
  if (!res.ok || !res.body) {
    throw new AppError(
      res.error || "Failed to claim challenge reward",
      res.status ?? 502
    );
  }
  return { reward_label: res.body.reward_label };
};
