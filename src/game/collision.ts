import { ITEM_SIZE, PAN_HEIGHT, PAN_WIDTH_RATIO } from './constants';

export type FallingItem = {
  key: number;
  itemId: import('./items').ItemId;
  x: number;
  y: number;
};

export function panWidthFor(playWidth: number): number {
  return playWidth * PAN_WIDTH_RATIO;
}

export function clampPanX(x: number, playWidth: number): number {
  const half = panWidthFor(playWidth) / 2;
  return Math.min(Math.max(x, half), Math.max(half, playWidth - half));
}

export function randomItemX(playWidth: number, random: () => number = Math.random): number {
  const half = ITEM_SIZE / 2;
  const min = half;
  const max = Math.max(min, playWidth - half);
  return min + random() * (max - min);
}

/** Item centre vs the pan rectangle at the bottom of the play area. */
export function itemHitsPan(
  item: Pick<FallingItem, 'x' | 'y'>,
  panCenterX: number,
  playWidth: number,
  playHeight: number,
  panBottomOffset: number
): boolean {
  const width = panWidthFor(playWidth);
  const panLeft = panCenterX - width / 2;
  const panRight = panCenterX + width / 2;
  const panBottom = playHeight - panBottomOffset;
  const panTop = panBottom - PAN_HEIGHT;

  return item.x >= panLeft && item.x <= panRight && item.y >= panTop && item.y <= panBottom;
}

export function itemHitsFloor(itemY: number, playHeight: number): boolean {
  return itemY >= playHeight;
}
