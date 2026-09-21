export type MustHaveId = 'dough' | 'sauce' | 'cheese';
export type JunkId = 'banana' | 'iceCream';
export type ItemId = MustHaveId | JunkId;

export type ItemKind = 'mustHave' | 'junk';

export type ItemDef = {
  id: ItemId;
  kind: ItemKind;
  emoji: string;
  label: string;
};

export const MUST_HAVE_IDS: MustHaveId[] = ['dough', 'sauce', 'cheese'];
export const JUNK_IDS: JunkId[] = ['banana', 'iceCream'];

export const ITEMS: Record<ItemId, ItemDef> = {
  dough: { id: 'dough', kind: 'mustHave', emoji: '🫓', label: 'Dough' },
  sauce: { id: 'sauce', kind: 'mustHave', emoji: '🍅', label: 'Sauce' },
  cheese: { id: 'cheese', kind: 'mustHave', emoji: '🧀', label: 'Cheese' },
  banana: { id: 'banana', kind: 'junk', emoji: '🍌', label: 'banana' },
  iceCream: { id: 'iceCream', kind: 'junk', emoji: '🍦', label: 'ice cream' },
};

export function isMustHave(id: ItemId): id is MustHaveId {
  return ITEMS[id].kind === 'mustHave';
}

export function isJunk(id: ItemId): id is JunkId {
  return ITEMS[id].kind === 'junk';
}
