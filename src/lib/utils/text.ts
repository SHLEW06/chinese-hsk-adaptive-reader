/** Shared text helpers. */

export const isCJK = (ch: string): boolean => /[\u4e00-\u9fff]/.test(ch);

export const containsCJK = (text: string): boolean => /[\u4e00-\u9fff]/.test(text);

/** Count CJK characters in a string. */
export const countCJK = (text: string): number =>
  (text.match(/[\u4e00-\u9fff]/g) || []).length;

/** Small unique id generator (no external deps). */
export const uid = (prefix = "id"): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const truncate = (text: string, n = 60): string =>
  text.length > n ? text.slice(0, n) + "…" : text;
