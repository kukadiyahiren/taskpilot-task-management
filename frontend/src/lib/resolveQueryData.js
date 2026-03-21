/**
 * Prefer live TanStack Query data; after fetch settles unsuccessfully, use static fallback.
 * Successful responses (including empty arrays) keep backend data.
 */
export function resolveQueryData(query, fallback) {
  if (query.isSuccess) {
    return { data: query.data, isFallback: false };
  }
  if (query.isFetched) {
    return { data: fallback, isFallback: true };
  }
  return { data: undefined, isFallback: false };
}
