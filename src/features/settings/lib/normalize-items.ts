import type { DatasheetItem } from '../model/datasheet-types';

/** join fetch 등으로 같은 item/slot 이 여러 번 올 때 id 기준 중복 제거 */
export function normalizeDatasheetItems(items: DatasheetItem[]): DatasheetItem[] {
  const seenItemIds = new Set<number>();
  const result: DatasheetItem[] = [];

  for (const item of items) {
    if (seenItemIds.has(item.id)) continue;
    seenItemIds.add(item.id);

    if (!item.slots || item.slots.length === 0) {
      result.push(item);
      continue;
    }

    const seenSlotIds = new Set<number>();
    const slots = item.slots.filter((slot) => {
      if (seenSlotIds.has(slot.id)) return false;
      seenSlotIds.add(slot.id);
      return true;
    });

    const seenRuleIds = new Set<number>();
    const rangeRules = (item.rangeRules ?? []).filter((rule) => {
      if (rule.id == null) return true;
      if (seenRuleIds.has(rule.id)) return false;
      seenRuleIds.add(rule.id);
      return true;
    });

    result.push({ ...item, slots, rangeRules });
  }

  return result;
}
