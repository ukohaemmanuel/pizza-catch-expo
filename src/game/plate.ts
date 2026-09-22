import { ACCEPT_RADIUS_RATIO, REJECT_SWIPE_SPEED } from './constants';

export type Circle = {
  cx: number;
  cy: number;
  r: number;
};

export function pointInCircle(x: number, y: number, circle: Circle, ratio = 1): boolean {
  const dx = x - circle.cx;
  const dy = y - circle.cy;
  return dx * dx + dy * dy <= (circle.r * ratio) * (circle.r * ratio);
}

/** Token centre must land mostly on the plate to accept. */
export function dropIsOnPlate(x: number, y: number, plate: Circle): boolean {
  if (plate.r <= 0) {
    return false;
  }
  if (pointInCircle(x, y, plate, ACCEPT_RADIUS_RATIO)) {
    return true;
  }
  return Math.abs(x - plate.cx) <= plate.r && Math.abs(y - plate.cy) <= plate.r;
}

/**
 * Fast swipe that is not over the plate rejects.
 * Slow drops off-plate snap back to the rail (caller handles that).
 */
export function swipeIsReject(vx: number, vy: number, overPlate: boolean): boolean {
  if (overPlate) {
    return false;
  }
  return Math.hypot(vx, vy) >= REJECT_SWIPE_SPEED;
}
