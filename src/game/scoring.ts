import {
  EXTRA_TOPPING_POINTS,
  FIRST_CATCH_POINTS,
  GRADE_S_MIN_SCORE,
  JUNK_CATCH_PENALTY,
  MISSING_TYPE_PENALTY,
} from './constants';
import {
  ITEMS,
  JUNK_IDS,
  MUST_HAVE_IDS,
  type ItemId,
  type JunkId,
  type MustHaveId,
} from './items';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'Fail';

export type ScoreState = {
  score: number;
  mustHaveCounts: Record<MustHaveId, number>;
  junkCounts: Record<JunkId, number>;
};

export type CatchResult = {
  state: ScoreState;
  delta: number;
  label: string;
};

function cloneState(state: ScoreState): ScoreState {
  return {
    score: state.score,
    mustHaveCounts: { ...state.mustHaveCounts },
    junkCounts: { ...state.junkCounts },
  };
}

export function createScoreState(): ScoreState {
  return {
    score: 0,
    mustHaveCounts: { dough: 0, sauce: 0, cheese: 0 },
    junkCounts: { banana: 0, iceCream: 0 },
  };
}

export function uniqueMustHaveTypes(state: ScoreState): number {
  return MUST_HAVE_IDS.filter((id) => state.mustHaveCounts[id] > 0).length;
}

export function junkTotal(state: ScoreState): number {
  return JUNK_IDS.reduce((sum, id) => sum + state.junkCounts[id], 0);
}

export function applyCatch(state: ScoreState, itemId: ItemId): CatchResult {
  const next = cloneState(state);
  const def = ITEMS[itemId];

  if (def.kind === 'mustHave') {
    const id = itemId as MustHaveId;
    const extra = next.mustHaveCounts[id] > 0;
    const delta = extra ? EXTRA_TOPPING_POINTS : FIRST_CATCH_POINTS;
    next.mustHaveCounts[id] += 1;
    next.score += delta;
    return {
      state: next,
      delta,
      label: extra ? `+${delta} extra topping` : `+${delta}`,
    };
  }

  const id = itemId as JunkId;
  next.junkCounts[id] += 1;
  next.score -= JUNK_CATCH_PENALTY;
  return {
    state: next,
    delta: -JUNK_CATCH_PENALTY,
    label: `-${JUNK_CATCH_PENALTY}`,
  };
}

export function applyTimeUp(state: ScoreState): {
  state: ScoreState;
  missing: MustHaveId[];
  penalty: number;
} {
  const missing = MUST_HAVE_IDS.filter((id) => state.mustHaveCounts[id] === 0);
  const penalty = missing.length * MISSING_TYPE_PENALTY;
  const next = cloneState(state);
  next.score -= penalty;
  return { state: next, missing, penalty };
}

/**
 * Grade after time-up penalties are applied.
 * - S: all 3 types, 0 junk, score ≥ 300
 * - A: all 3 types, 0 junk
 * - B: all 3 types, 1 junk
 * - C: 2 of 3 types
 * - Fail: fewer than 2 types, or 2+ junk
 */
export function computeGrade(state: ScoreState): Grade {
  const types = uniqueMustHaveTypes(state);
  const junk = junkTotal(state);

  if (junk >= 2 || types < 2) {
    return 'Fail';
  }
  if (types === 2) {
    return 'C';
  }
  if (junk === 0 && state.score >= GRADE_S_MIN_SCORE) {
    return 'S';
  }
  if (junk === 0) {
    return 'A';
  }
  return 'B';
}

export function formatSummary(state: ScoreState): string {
  const mark = (id: MustHaveId) => (state.mustHaveCounts[id] > 0 ? '✓' : '✗');
  const types = MUST_HAVE_IDS.map((id) => `${ITEMS[id].label} ${mark(id)}`).join(' ');

  const junkBits = JUNK_IDS.filter((id) => state.junkCounts[id] > 0).map(
    (id) => `${ITEMS[id].label} ×${state.junkCounts[id]}`
  );
  const junkLine = junkBits.length > 0 ? junkBits.join(', ') : 'none';

  return `${types}\nJunk: ${junkLine}`;
}
