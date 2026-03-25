/**
 * Whether the trimmed query is long enough to run a search.
 * JS `length` is 1 per CJK code unit, so "窮" was wrongly blocked by a naive `length < 2` rule.
 * We still block a single ASCII letter/digit (too noisy for LIKE %q%).
 */
export function isSearchQueryAllowed(query: string): boolean {
  const q = query.trim();
  if (q.length === 0) return false;
  if (q.length >= 2) return true;
  // Single character
  const ch = q[0];
  const cp = ch.codePointAt(0)!;
  if (cp < 128 && /[a-zA-Z0-9]/.test(ch)) return false;
  return true;
}
