export const PAGE_SIZE = 6;

type RawParam = string | string[] | undefined;

/** The URL is the state: read it on the server from `searchParams`, or in the browser from useSearchParams. */
export function parseSearch(params: { query?: RawParam; page?: RawParam }) {
  const first = (value: RawParam) => (Array.isArray(value) ? value[0] : value) ?? "";
  const query = first(params.query).trim();
  const page = Number.parseInt(first(params.page), 10);
  return { query, page: Number.isInteger(page) && page > 0 ? page : 1 };
}

interface Searchable {
  title: string;
  author: { name: string };
}

export function filterTracks<T extends Searchable>(tracks: readonly T[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return tracks;
  return tracks.filter(
    ({ title, author }) =>
      title.toLowerCase().includes(needle) || author.name.toLowerCase().includes(needle),
  );
}

export function paginate<T>(items: readonly T[], requestedPage: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, totalPages };
}

/** Builds `pathname?query=…&page=…`, omitting defaults so the canonical list URL stays clean. */
export function searchHref(pathname: string, { query, page }: { query: string; page: number }) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
