import type { DatasheetItem } from '@/features/settings';

export type InspectionSequenceEntry = {
  order: number;
  label: string;
  itemId: number;
};

export function isInspectionItem(item: DatasheetItem) {
  if (item.groupName === '검사 항목') return true;
  if (item.groupName === '기본정보') return false;
  return item.inspectionItem;
}

/**
 * 검사 순서: 검사 항목만 sortOrder(→ itemNo) 기준으로 라벨 나열
 */
export function buildInspectionSequence(
  items: DatasheetItem[],
): InspectionSequenceEntry[] {
  return items
    .filter(isInspectionItem)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.itemNo - b.itemNo;
    })
    .map((item, index) => ({
      order: index + 1,
      label: item.label,
      itemId: item.id,
    }));
}

export function countInspectionItems(items: DatasheetItem[]) {
  const inspectionItems = items.filter(isInspectionItem);
  return {
    total: inspectionItems.length,
    skippable: inspectionItems.filter((item) => item.skippable).length,
  };
}
