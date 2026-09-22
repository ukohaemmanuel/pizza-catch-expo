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

/** Internal letter mapping from the original playtest. */
export type Grade = 'S' | 'A' | 'B' | 'C' | 'Fail';

export type PlatingLabel = 'Clean' | 'Solid' | 'Messy' | 'Ruined';

export type ScoreState = {
  score: number;
  mustHaveCounts: Record<MustHaveId, number>;
  junkCounts: Record<JunkId, number>;
};

export type AcceptResult = {
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

export function missingMustHaves(state: ScoreState): MustHaveId[] {
  return MUST_HAVE_IDS.filter((id) => state.mustHaveCounts[id] === 0);
}

/** Drag onto the plate. Same math as the original catch rules. */
export function applyAccept(state: ScoreState, itemId: ItemId): AcceptResult {
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

/** @deprecated plating uses applyAccept; kept for the original catch math tests. */
export const applyCatch = applyAccept;

/** Swiping junk off the rail is clean — no score change. */
export function applyReject(_state: ScoreState, _itemId: ItemId): ScoreState {
  return _state;
}

export function applyTimeUp(state: ScoreState): {
  state: ScoreState;
  missing: MustHaveId[];
  penalty: number;
} {
  const missing = missingMustHaves(state);
  const penalty = missing.length * MISSING_TYPE_PENALTY;
  const next = cloneState(state);
  next.score -= penalty;
  return { state: next, missing, penalty };
}

/**
 * Letter grade after time-up penalties (original rules).
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

/**
 * Desk labels shown in the UI.
 * Clean ≈ S/A, Solid ≈ all 3 with at most 1 junk, Messy ≈ 2 types, Ruined ≈ fail.
 */
export function computePlatingLabel(state: ScoreState): PlatingLabel {
  const grade = computeGrade(state);
  if (grade === 'S' || grade === 'A') {
    return 'Clean';
  }
  if (grade === 'B') {
    return 'Solid';
  }
  if (grade === 'C') {
    return 'Messy';
  }
  return 'Ruined';
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

export function chefLine(state: ScoreState): string {
  const junk = junkTotal(state);
  if (junk > 0) {
    const first = JUNK_IDS.find((id) => state.junkCounts[id] > 0);
    const name = first ? ITEMS[first].label : 'junk';
    return `Spoiled — ${name} on a pizza.`;
  }

  const missing = missingMustHaves(state);
  if (missing.length === 0) {
    return 'Clean build.';
  }

  const names = missing.map((id) => ITEMS[id].label.toLowerCase()).join(', ');
  return `Clean build. Missing ${names}.`;
}
