import { AppError } from './classError';
export function pagination(query: { page?: unknown; limit?: unknown }) {
  const page = Number(query.page ?? 1), limit = Number(query.limit ?? 10);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || (page - 1) * limit > 1000000) throw new AppError('Use a positive page and a limit between 1 and 50', 400);
  return { page, limit, skip: (page - 1) * limit };
}
