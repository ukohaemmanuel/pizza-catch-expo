import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MUST_HAVE_IDS } from './items';
import { pickSpawnItem } from './spawn';

function sequence(values: number[]): () => number {
  let i = 0;
  return () => {
    const value = values[Math.min(i, values.length - 1)];
    i += 1;
    return value;
  };
}

describe('pickSpawnItem', () => {
  it('can spawn junk', () => {
    const item = pickSpawnItem(
      { dough: 0, sauce: 0, cheese: 0 },
      sequence([0.0, 0.0])
    );
    assert.equal(item, 'banana');
  });

  it('prefers a missing must-have when not spawning junk', () => {
    const item = pickSpawnItem(
      { dough: 1, sauce: 0, cheese: 1 },
      sequence([0.9, 0.0, 0.0])
    );
    assert.equal(item, 'sauce');
  });

  it('only returns known item ids', () => {
    const counts = { dough: 0, sauce: 0, cheese: 0 };
    for (let i = 0; i < 50; i += 1) {
      const item = pickSpawnItem(counts, () => Math.random());
      assert.ok(
        item === 'banana' ||
          item === 'iceCream' ||
          (MUST_HAVE_IDS as string[]).includes(item)
      );
    }
  });
});
