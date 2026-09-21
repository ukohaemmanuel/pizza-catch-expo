import { JUNK_SPAWN_CHANCE, PREFER_MISSING_CHANCE } from './constants';
import { JUNK_IDS, MUST_HAVE_IDS, type ItemId, type MustHaveId } from './items';

export type RandomFn = () => number;

function pickOne<T>(items: readonly T[], random: RandomFn): T {
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index];
}

export function pickSpawnItem(
  mustHaveCounts: Record<MustHaveId, number>,
  random: RandomFn = Math.random
): ItemId {
  if (random() < JUNK_SPAWN_CHANCE) {
    return pickOne(JUNK_IDS, random);
  }

  const missing = MUST_HAVE_IDS.filter((id) => mustHaveCounts[id] === 0);
  if (missing.length > 0 && random() < PREFER_MISSING_CHANCE) {
    return pickOne(missing, random);
  }

  return pickOne(MUST_HAVE_IDS, random);
}
