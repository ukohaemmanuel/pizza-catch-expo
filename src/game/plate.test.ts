import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dropIsOnPlate, swipeIsReject } from './plate';

const plate = { cx: 200, cy: 300, r: 100 };

describe('dropIsOnPlate', () => {
  it('accepts a token whose centre is on the plate', () => {
    assert.equal(dropIsOnPlate(200, 300, plate), true);
    assert.equal(dropIsOnPlate(200, 370, plate), true);
  });

  it('rejects a token that only clips the rim', () => {
    assert.equal(dropIsOnPlate(200, 420, plate), false);
    assert.equal(dropIsOnPlate(40, 40, plate), false);
  });
});

describe('swipeIsReject', () => {
  it('rejects a fast flick that is not over the plate', () => {
    assert.equal(swipeIsReject(0.9, 0, false), true);
    assert.equal(swipeIsReject(0, -1.2, false), true);
  });

  it('does not reject a slow drop off the plate (snap back)', () => {
    assert.equal(swipeIsReject(0.1, 0.1, false), false);
  });

  it('never rejects a swipe that lands on the plate', () => {
    assert.equal(swipeIsReject(2, 2, true), false);
  });
});
