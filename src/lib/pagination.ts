export type SearchParams = Record<string, string | string[] | undefined>;

export type PaginationInfo = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function pageFromSearchParams(params: SearchParams, key: string) {
  const parsed = Number(firstParam(params[key]));
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    items: items.slice(startIndex, endIndex),
    pageInfo: {
      page: currentPage,
      pageSize,
      totalItems,
      totalPages,
      startItem: totalItems === 0 ? 0 : startIndex + 1,
      endItem: endIndex
    } satisfies PaginationInfo
  };
}
