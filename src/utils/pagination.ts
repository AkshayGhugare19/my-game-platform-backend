/**
 * Shared server-side pagination helpers used by every list endpoint so the
 * response shape is uniform: `{ data, pagination: { total, page, limit,
 * totalPages } }` — the same shape `BaseRepository.paginate` already returns
 * for DB-backed lists. Use `paginateArray` for in-memory lists (e.g. catalogs
 * fetched from gamru).
 */

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PageMeta;
}

/** Coerce raw query params into safe page/limit numbers. */
export const readPageParams = (
  query: { page?: unknown; limit?: unknown } = {},
  defaultLimit = 10
): { page: number; limit: number } => {
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const limit = Math.min(
    100,
    Math.max(1, Math.floor(Number(query.limit) || defaultLimit))
  );
  return { page, limit };
};

/** Slice an already-loaded array into a paginated envelope. */
export const paginateArray = <T>(
  items: T[],
  page: number,
  limit: number
): Paginated<T> => {
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};
