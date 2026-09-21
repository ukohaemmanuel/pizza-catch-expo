import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAN_HEIGHT } from './constants';
import { clampPanX, itemHitsFloor, itemHitsPan, panWidthFor } from './collision';

describe('itemHitsPan', () => {
  const playWidth = 400;
  const playHeight = 800;
  const panBottomOffset = 16;
  const panY = playHeight - panBottomOffset - PAN_HEIGHT / 2;

  it('catches when the item centre is over the pan', () => {
    const panX = 200;
    assert.equal(
      itemHitsPan({ x: panX, y: panY }, panX, playWidth, playHeight, panBottomOffset),
      true
    );
  });

  it('misses when the item centre is beside the pan', () => {
    const panX = 200;
    const width = panWidthFor(playWidth);
    assert.equal(
      itemHitsPan(
        { x: panX + width / 2 + 8, y: panY },
        panX,
        playWidth,
        playHeight,
        panBottomOffset
      ),
      false
    );
  });
});

describe('itemHitsFloor', () => {
  it('triggers once the item centre has crossed the floor', () => {
    assert.equal(itemHitsFloor(800, 800), true);
    assert.equal(itemHitsFloor(400, 800), false);
  });
});

describe('clampPanX', () => {
  it('keeps the pan fully on screen', () => {
    const playWidth = 400;
    const half = panWidthFor(playWidth) / 2;
    assert.equal(clampPanX(0, playWidth), half);
    assert.equal(clampPanX(999, playWidth), playWidth - half);
    assert.equal(clampPanX(200, playWidth), 200);
  });
});
