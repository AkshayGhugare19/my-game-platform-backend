import { AppError } from "../../../utils/AppError.ts";
import BonusRepository from "../model/bonus.repository.ts";
import type Bonus from "../model/bonus.model.ts";
import type { AmountType, BonusStatus } from "../model/bonus.model.ts";

/** API view of a bonus — camelCase contract the admin UI / GAMRU operator uses. */
export interface BonusView {
  id: string;
  bonusName: string;
  bonusType: string;
  amount: number;
  amountType: AmountType;
  status: BonusStatus;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BonusInput {
  bonusName?: string;
  bonusType?: string;
  amount?: number;
  amountType?: AmountType;
  status?: BonusStatus;
  description?: string;
}

const toView = (b: Bonus): BonusView => ({
  id: b.id,
  bonusName: b.bonus_name,
  bonusType: b.bonus_type,
  amount: b.amount,
  amountType: b.amount_type,
  status: b.status,
  description: b.description,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
});

const validAmountType = (v: unknown): v is AmountType => v === "RM" || v === "BM";
const validStatus = (v: unknown): v is BonusStatus =>
  v === "ACTIVE" || v === "INACTIVE";

export const createBonus = async (input: BonusInput): Promise<BonusView> => {
  if (!input.bonusName?.trim())
    throw new AppError("bonusName is required", 400);
  if (!validAmountType(input.amountType))
    throw new AppError("amountType must be 'RM' or 'BM'", 400);
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new AppError("amount must be a positive number", 400);
  if (input.status !== undefined && !validStatus(input.status))
    throw new AppError("status must be 'ACTIVE' or 'INACTIVE'", 400);

  const bonus = await BonusRepository.create({
    bonus_name: input.bonusName.trim(),
    bonus_type: input.bonusType?.trim() || "BONUS_CASH",
    amount,
    amount_type: input.amountType,
    status: input.status ?? "ACTIVE",
    description: input.description ?? "",
  });
  return toView(bonus);
};

export const updateBonus = async (
  id: string,
  input: BonusInput
): Promise<BonusView> => {
  const bonus = await BonusRepository.findByPk(id);
  if (!bonus) throw new AppError("Bonus not found", 404);

  if (input.amountType !== undefined && !validAmountType(input.amountType))
    throw new AppError("amountType must be 'RM' or 'BM'", 400);
  if (input.status !== undefined && !validStatus(input.status))
    throw new AppError("status must be 'ACTIVE' or 'INACTIVE'", 400);
  if (input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      throw new AppError("amount must be a positive number", 400);
  }

  await bonus.update({
    ...(input.bonusName !== undefined ? { bonus_name: input.bonusName.trim() } : {}),
    ...(input.bonusType !== undefined ? { bonus_type: input.bonusType.trim() } : {}),
    ...(input.amount !== undefined ? { amount: Number(input.amount) } : {}),
    ...(input.amountType !== undefined ? { amount_type: input.amountType } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
  });
  return toView(bonus);
};

export const getBonus = async (id: string): Promise<BonusView> => {
  const bonus = await BonusRepository.findByPk(id);
  if (!bonus) throw new AppError("Bonus not found", 404);
  return toView(bonus);
};

/** All ACTIVE bonus definitions — consumed by GAMRU's snapshot sync. */
export const catalogBonuses = async (): Promise<BonusView[]> => {
  const rows = await BonusRepository.catalog();
  return rows.map(toView);
};

export const listBonuses = async (
  page: number,
  limit: number
): Promise<{
  data: BonusView[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}> => {
  const { data, pagination } = await BonusRepository.paginate(page, limit);
  return { data: data.map(toView), pagination };
};

export const deleteBonus = async (id: string): Promise<void> => {
  const ok = await BonusRepository.deleteByPk(id);
  if (!ok) throw new AppError("Bonus not found", 404);
};
