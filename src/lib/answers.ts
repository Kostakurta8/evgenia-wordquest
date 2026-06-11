/** Lenient answer checking for typed exercises — pure and unit-testable. */

/** "till (verb)" → "till"; "a wraith" → "wraith"; "to stride" → "stride" */
export function headwordBase(head: string): string {
  return head
    .replace(/\([^)]*\)/g, "")
    .replace(/^(a|an|the|to) /i, "")
    .trim();
}

/** lowercase, strip diacritics, collapse whitespace/punctuation noise */
export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Damerau–Levenshtein distance capped at 2 (enough for our tolerance rule). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/**
 * A typed answer is accepted when, after normalization, it equals any
 * accepted form — or is one typo away for forms of 6+ characters.
 */
export function isTypedCorrect(input: string, accepted: string[]): boolean {
  const got = normalizeAnswer(input);
  if (got.length === 0) return false;
  for (const form of accepted) {
    const want = normalizeAnswer(form);
    if (want.length === 0) continue;
    if (got === want) return true;
    if (want.length >= 6 && editDistance(got, want) <= 1) return true;
  }
  return false;
}

/** The inflected surface form inside a "**…**"-highlighted book sentence. */
export function highlightedForm(sentence: string): string | null {
  const m = sentence.match(/\*\*(.+?)\*\*/);
  return m ? m[1] : null;
}

/** Replace the highlighted word with a blank for the cloze exercise. */
export function clozeText(sentence: string): string {
  return sentence.replace(/\*\*(.+?)\*\*/, "______");
}
