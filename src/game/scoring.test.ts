import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyCatch,
  applyTimeUp,
  computeGrade,
  createScoreState,
  formatSummary,
  junkTotal,
  uniqueMustHaveTypes,
} from './scoring';

describe('applyCatch', () => {
  it('awards +100 the first time a must-have type is caught', () => {
    const result = applyCatch(createScoreState(), 'dough');
    assert.equal(result.delta, 100);
    assert.equal(result.label, '+100');
    assert.equal(result.state.score, 100);
    assert.equal(result.state.mustHaveCounts.dough, 1);
  });

  it('awards +50 extra topping for a duplicate must-have', () => {
    const first = applyCatch(createScoreState(), 'cheese');
    const extra = applyCatch(first.state, 'cheese');
    assert.equal(extra.delta, 50);
    assert.match(extra.label, /extra topping/);
    assert.equal(extra.state.score, 150);
    assert.equal(extra.state.mustHaveCounts.cheese, 2);
  });

  it('penalizes junk by 150 and marks it contaminated', () => {
    const result = applyCatch(createScoreState(), 'banana');
    assert.equal(result.delta, -150);
    assert.equal(result.state.score, -150);
    assert.equal(result.state.junkCounts.banana, 1);
    assert.equal(junkTotal(result.state), 1);
  });
});

describe('applyTimeUp', () => {
  it('subtracts 100 per missing must-have type', () => {
    let state = applyCatch(createScoreState(), 'dough').state;
    const ended = applyTimeUp(state);
    assert.deepEqual(ended.missing, ['sauce', 'cheese']);
    assert.equal(ended.penalty, 200);
    assert.equal(ended.state.score, -100);
  });

  it('does not penalize types that were already caught', () => {
    let state = createScoreState();
    state = applyCatch(state, 'dough').state;
    state = applyCatch(state, 'sauce').state;
    state = applyCatch(state, 'cheese').state;
    const ended = applyTimeUp(state);
    assert.deepEqual(ended.missing, []);
    assert.equal(ended.penalty, 0);
    assert.equal(ended.state.score, 300);
  });
});

describe('computeGrade', () => {
  it('gives S for all 3 types, 0 junk, score ≥ 300', () => {
    let state = createScoreState();
    state = applyCatch(state, 'dough').state;
    state = applyCatch(state, 'sauce').state;
    state = applyCatch(state, 'cheese').state;
    state = applyTimeUp(state).state;
    assert.equal(uniqueMustHaveTypes(state), 3);
    assert.equal(junkTotal(state), 0);
    assert.equal(state.score, 300);
    assert.equal(computeGrade(state), 'S');
  });

  it('gives A for all 3 types, 0 junk, score under 300', () => {
    const state = createScoreState();
    state.mustHaveCounts = { dough: 1, sauce: 1, cheese: 1 };
    state.score = 250;
    assert.equal(computeGrade(state), 'A');
  });

  it('gives B for all 3 types and exactly 1 junk', () => {
    let state = createScoreState();
    state = applyCatch(state, 'dough').state;
    state = applyCatch(state, 'sauce').state;
    state = applyCatch(state, 'cheese').state;
    state = applyCatch(state, 'banana').state;
    assert.equal(computeGrade(state), 'B');
  });

  it('gives C for exactly 2 of 3 types', () => {
    let state = createScoreState();
    state = applyCatch(state, 'dough').state;
    state = applyCatch(state, 'sauce').state;
    assert.equal(computeGrade(state), 'C');
  });

  it('fails when fewer than 2 types are caught', () => {
    const none = createScoreState();
    assert.equal(computeGrade(none), 'Fail');
    const one = applyCatch(createScoreState(), 'cheese').state;
    assert.equal(computeGrade(one), 'Fail');
  });

  it('fails when 2 or more junk items are caught, even with all types', () => {
    let state = createScoreState();
    state = applyCatch(state, 'dough').state;
    state = applyCatch(state, 'sauce').state;
    state = applyCatch(state, 'cheese').state;
    state = applyCatch(state, 'banana').state;
    state = applyCatch(state, 'iceCream').state;
    assert.equal(junkTotal(state), 2);
    assert.equal(computeGrade(state), 'Fail');
  });
});

describe('formatSummary', () => {
  it('matches the playtest summary style', () => {
    let state = createScoreState();
    state = applyCatch(state, 'dough').state;
    state = applyCatch(state, 'sauce').state;
    state = applyCatch(state, 'banana').state;
    assert.equal(formatSummary(state), 'Dough ✓ Sauce ✓ Cheese ✗\nJunk: banana ×1');
  });

  it('shows none when no junk was caught', () => {
    const state = applyCatch(createScoreState(), 'cheese').state;
    assert.equal(formatSummary(state), 'Dough ✗ Sauce ✗ Cheese ✓\nJunk: none');
  });
});
