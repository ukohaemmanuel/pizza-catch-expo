import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyAccept,
  applyCatch,
  applyReject,
  applyTimeUp,
  chefLine,
  computeGrade,
  computePlatingLabel,
  createScoreState,
  formatSummary,
  junkTotal,
  uniqueMustHaveTypes,
} from './scoring';

describe('applyAccept', () => {
  it('awards +100 the first time a must-have is plated', () => {
    const result = applyAccept(createScoreState(), 'dough');
    assert.equal(result.delta, 100);
    assert.equal(result.label, '+100');
    assert.equal(result.state.score, 100);
    assert.equal(result.state.mustHaveCounts.dough, 1);
  });

  it('awards +50 extra topping for a duplicate must-have', () => {
    const first = applyAccept(createScoreState(), 'cheese');
    const extra = applyAccept(first.state, 'cheese');
    assert.equal(extra.delta, 50);
    assert.match(extra.label, /extra topping/);
    assert.equal(extra.state.score, 150);
    assert.equal(extra.state.mustHaveCounts.cheese, 2);
  });

  it('penalizes junk by 150 and marks it contaminated', () => {
    const result = applyAccept(createScoreState(), 'banana');
    assert.equal(result.delta, -150);
    assert.equal(result.state.score, -150);
    assert.equal(result.state.junkCounts.banana, 1);
    assert.equal(junkTotal(result.state), 1);
  });

  it('keeps applyCatch as an alias of the same math', () => {
    const a = applyAccept(createScoreState(), 'sauce');
    const b = applyCatch(createScoreState(), 'sauce');
    assert.deepEqual(a, b);
  });
});

describe('applyReject', () => {
  it('does not change score when junk is swiped off the rail', () => {
    const start = createScoreState();
    const next = applyReject(start, 'iceCream');
    assert.equal(next.score, 0);
    assert.equal(junkTotal(next), 0);
  });

  it('does not plate a rejected must-have (pressure is the missing-slot penalty later)', () => {
    const start = createScoreState();
    const next = applyReject(start, 'dough');
    assert.equal(next.mustHaveCounts.dough, 0);
    assert.equal(next.score, 0);
  });
});

describe('applyTimeUp', () => {
  it('subtracts 100 per empty required slot', () => {
    let state = applyAccept(createScoreState(), 'dough').state;
    const ended = applyTimeUp(state);
    assert.deepEqual(ended.missing, ['sauce', 'cheese']);
    assert.equal(ended.penalty, 200);
    assert.equal(ended.state.score, -100);
  });

  it('does not penalize types that were already plated', () => {
    let state = createScoreState();
    state = applyAccept(state, 'dough').state;
    state = applyAccept(state, 'sauce').state;
    state = applyAccept(state, 'cheese').state;
    const ended = applyTimeUp(state);
    assert.deepEqual(ended.missing, []);
    assert.equal(ended.penalty, 0);
    assert.equal(ended.state.score, 300);
  });
});

describe('computeGrade / computePlatingLabel', () => {
  it('gives Clean for all 3 types, 0 junk, score ≥ 300 (old S)', () => {
    let state = createScoreState();
    state = applyAccept(state, 'dough').state;
    state = applyAccept(state, 'sauce').state;
    state = applyAccept(state, 'cheese').state;
    state = applyTimeUp(state).state;
    assert.equal(computeGrade(state), 'S');
    assert.equal(computePlatingLabel(state), 'Clean');
  });

  it('gives Clean for all 3 types, 0 junk, score under 300 (old A)', () => {
    const state = createScoreState();
    state.mustHaveCounts = { dough: 1, sauce: 1, cheese: 1 };
    state.score = 250;
    assert.equal(computeGrade(state), 'A');
    assert.equal(computePlatingLabel(state), 'Clean');
  });

  it('gives Solid for all 3 types and exactly 1 junk (old B)', () => {
    let state = createScoreState();
    state = applyAccept(state, 'dough').state;
    state = applyAccept(state, 'sauce').state;
    state = applyAccept(state, 'cheese').state;
    state = applyAccept(state, 'banana').state;
    assert.equal(computeGrade(state), 'B');
    assert.equal(computePlatingLabel(state), 'Solid');
  });

  it('gives Messy for exactly 2 of 3 types (old C)', () => {
    let state = createScoreState();
    state = applyAccept(state, 'dough').state;
    state = applyAccept(state, 'sauce').state;
    assert.equal(uniqueMustHaveTypes(state), 2);
    assert.equal(computeGrade(state), 'C');
    assert.equal(computePlatingLabel(state), 'Messy');
  });

  it('gives Ruined when fewer than 2 types are plated', () => {
    const none = createScoreState();
    assert.equal(computePlatingLabel(none), 'Ruined');
    const one = applyAccept(createScoreState(), 'cheese').state;
    assert.equal(computePlatingLabel(one), 'Ruined');
  });

  it('gives Ruined when 2 or more junk items are plated, even with all types', () => {
    let state = createScoreState();
    state = applyAccept(state, 'dough').state;
    state = applyAccept(state, 'sauce').state;
    state = applyAccept(state, 'cheese').state;
    state = applyAccept(state, 'banana').state;
    state = applyAccept(state, 'iceCream').state;
    assert.equal(junkTotal(state), 2);
    assert.equal(computeGrade(state), 'Fail');
    assert.equal(computePlatingLabel(state), 'Ruined');
  });
});

describe('formatSummary / chefLine', () => {
  it('matches the plated summary style', () => {
    let state = createScoreState();
    state = applyAccept(state, 'dough').state;
    state = applyAccept(state, 'sauce').state;
    state = applyAccept(state, 'banana').state;
    assert.equal(formatSummary(state), 'Dough ✓ Sauce ✓ Cheese ✗\nJunk: banana ×1');
  });

  it('uses a spoiled chef line when junk is on the plate', () => {
    const state = applyAccept(createScoreState(), 'banana').state;
    assert.equal(chefLine(state), 'Spoiled — banana on a pizza.');
  });

  it('mentions missing slots on an otherwise clean plate', () => {
    let state = applyAccept(createScoreState(), 'dough').state;
    state = applyAccept(state, 'sauce').state;
    assert.equal(chefLine(state), 'Clean build. Missing cheese.');
  });

  it('says Clean build when all slots are filled and there is no junk', () => {
    let state = createScoreState();
    state = applyAccept(state, 'dough').state;
    state = applyAccept(state, 'sauce').state;
    state = applyAccept(state, 'cheese').state;
    assert.equal(chefLine(state), 'Clean build.');
  });

  it('does not call an empty plate a clean build', () => {
    assert.equal(chefLine(createScoreState()), 'Nothing made it to the plate.');
  });
});
