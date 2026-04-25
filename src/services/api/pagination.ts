export type PaginationOptions = {
  limit?: number;
  cursor?: string | null;
};

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
};

export function appendPaginationParams(params: URLSearchParams, pagination?: PaginationOptions) {
  if (pagination?.limit) params.set('limit', String(pagination.limit));
  if (pagination?.cursor) params.set('cursor', pagination.cursor);
}
