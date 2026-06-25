import type { SrsGrade, SrsState } from "@/types/hskStudy";

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Build a fresh SRS state for a brand-new card. */
export function newSrsState(now: Date = new Date()): SrsState {
  return {
    interval: 0,
    ease: DEFAULT_EASE,
    reps: 0,
    lapses: 0,
    dueAt: now.toISOString(),
  };
}

/**
 * Apply a grade to an SRS state and return the next state.
 * Pure: does not mutate the input.
 *
 * Loosely SM-2:
 *  - Again: reset interval, drop ease, count a lapse, due tomorrow.
 *  - Hard:  bump interval gently, drop ease a little.
 *  - Good:  multiply interval by ease (standard).
 *  - Easy:  multiply by ease * 1.3 and raise ease.
 */
export function gradeSrs(
  prev: SrsState | undefined,
  grade: SrsGrade,
  now: Date = new Date(),
): SrsState {
  const state = prev ?? newSrsState(now);
  let { interval, ease, reps, lapses } = state;

  switch (grade) {
    case "again":
      lapses += 1;
      reps = 0;
      ease = Math.max(MIN_EASE, ease - 0.2);
      interval = 1;
      break;
    case "hard":
      ease = Math.max(MIN_EASE, ease - 0.15);
      interval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
      reps += 1;
      break;
    case "good":
      if (interval === 0) interval = 1;
      else if (reps === 0) interval = Math.max(1, Math.round(interval * ease));
      else interval = Math.max(1, Math.round(interval * ease));
      reps += 1;
      break;
    case "easy":
      ease = ease + 0.15;
      if (interval === 0) interval = 2;
      else interval = Math.max(1, Math.round(interval * ease * 1.3));
      reps += 1;
      break;
  }

  return {
    interval,
    ease,
    reps,
    lapses,
    dueAt: new Date(now.getTime() + interval * DAY_MS).toISOString(),
    lastReviewed: now.toISOString(),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * In-session scheduler
 *
 * The point of this layer (vs. just dueAt) is the interleaving the user asked
 * for: a card you flunk reappears a few cards later, not immediately and not
 * at the end of the deck. Each card has an in-session "position" that we
 * advance based on the grade. We always show the card with the smallest
 * position, breaking ties by insertion order.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface SessionCard<T> {
  /** Stable id (e.g. simplified form). */
  id: string;
  /** Caller-supplied payload (the dictionary entry). */
  data: T;
  /** Persisted SRS state at session start (undefined = brand new). */
  initialSrs?: SrsState;
  /** In-session position; lower = sooner. */
  position: number;
  /** Times graded in this session (any grade). */
  sessionReps: number;
  /** Times graded "good" or "easy" in this session. */
  goodReps: number;
  /** Latest SRS state computed from grading in this session. */
  srs?: SrsState;
  /** True once the card has graduated out of the session queue. */
  done: boolean;
}

export interface SessionState<T> {
  cards: SessionCard<T>[];
  /** Monotonic tick — used to break ties and to advance positions. */
  tick: number;
}

/** How far ahead in the queue a card jumps after each grade. */
const STEP_AHEAD: Record<SrsGrade, number> = {
  again: 3,
  hard: 6,
  good: 14,
  easy: 9999, // effectively "remove from session"
};

/** A card graduates from the session after this many non-Again grades. */
export const GRADUATE_AT = 2;

export function buildSession<T>(
  items: Array<{ id: string; data: T; srs?: SrsState }>,
): SessionState<T> {
  const cards: SessionCard<T>[] = items.map((it, i) => ({
    id: it.id,
    data: it.data,
    initialSrs: it.srs,
    position: i,
    sessionReps: 0,
    goodReps: 0,
    srs: it.srs,
    done: false,
  }));
  return { cards, tick: items.length };
}

export function pickNext<T>(state: SessionState<T>): SessionCard<T> | null {
  let best: SessionCard<T> | null = null;
  for (const c of state.cards) {
    if (c.done) continue;
    if (!best || c.position < best.position) best = c;
  }
  return best;
}

export function applyGrade<T>(
  state: SessionState<T>,
  cardId: string,
  grade: SrsGrade,
  now: Date = new Date(),
): SessionState<T> {
  const cards = state.cards.map((c) => ({ ...c }));
  const card = cards.find((c) => c.id === cardId);
  if (!card) return state;

  card.srs = gradeSrs(card.srs, grade, now);
  card.sessionReps += 1;
  if (grade === "good" || grade === "easy") card.goodReps += 1;
  if (grade === "again") card.goodReps = 0;

  const graduated = grade === "easy" || card.goodReps >= GRADUATE_AT;
  if (graduated) {
    card.done = true;
  } else {
    card.position = state.tick + STEP_AHEAD[grade];
  }

  return { cards, tick: state.tick + 1 };
}

export function remaining<T>(state: SessionState<T>): number {
  return state.cards.reduce((n, c) => (c.done ? n : n + 1), 0);
}

export function graduated<T>(state: SessionState<T>): number {
  return state.cards.reduce((n, c) => (c.done ? n + 1 : n), 0);
}

export function pendingSrsUpdates<T>(state: SessionState<T>): Record<string, SrsState> {
  const out: Record<string, SrsState> = {};
  for (const c of state.cards) {
    if (c.srs && c.sessionReps > 0) out[c.id] = c.srs;
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Deck selection
 * ──────────────────────────────────────────────────────────────────────────── */

export interface PickDeckOptions {
  /** Max number of due review cards to include. */
  maxReviews?: number;
  /** Max number of brand-new cards to include. */
  maxNew?: number;
}

/**
 * Choose which words to study in this session.
 *  - All cards whose dueAt <= now (up to maxReviews), oldest-due first.
 *  - Plus up to maxNew brand-new cards (no SRS state yet) in input order.
 */
export function pickDeck<T>(
  pool: T[],
  getId: (item: T) => string,
  srsMap: Record<string, SrsState>,
  opts: PickDeckOptions = {},
  now: Date = new Date(),
): Array<{ id: string; data: T; srs?: SrsState }> {
  const maxReviews = opts.maxReviews ?? 50;
  const maxNew = opts.maxNew ?? 10;
  const nowMs = now.getTime();

  const due: Array<{ item: T; id: string; srs: SrsState }> = [];
  const fresh: Array<{ item: T; id: string }> = [];
  for (const item of pool) {
    const id = getId(item);
    const srs = srsMap[id];
    if (!srs) {
      fresh.push({ item, id });
      continue;
    }
    if (new Date(srs.dueAt).getTime() <= nowMs) {
      due.push({ item, id, srs });
    }
  }
  due.sort((a, b) => a.srs.dueAt.localeCompare(b.srs.dueAt));

  const reviewSlice = due.slice(0, maxReviews).map(({ item, id, srs }) => ({
    id,
    data: item,
    srs,
  }));
  const newSlice = fresh.slice(0, maxNew).map(({ item, id }) => ({ id, data: item }));

  // Interleave new cards across reviews so the session doesn't front-load either.
  const merged: Array<{ id: string; data: T; srs?: SrsState }> = [];
  const total = reviewSlice.length + newSlice.length;
  let ri = 0;
  let ni = 0;
  for (let i = 0; i < total; i++) {
    const newWanted = Math.round(((i + 1) * newSlice.length) / total);
    if (ni < newWanted) merged.push(newSlice[ni++]);
    else merged.push(reviewSlice[ri++]);
  }
  return merged;
}
