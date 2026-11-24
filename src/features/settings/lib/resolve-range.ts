import type { DatasheetItem } from '../model/datasheet-types';

/**
 * 기종(기준 항목)에서 선택된 슬롯 인덱스로 숫자 항목의 유효 min/max 를 구한다.
 * 규칙이 없으면 항목 기본 min/max 를 쓴다.
 */
export function resolveItemRange(
  item: DatasheetItem,
  selectedSlotIndex: number | null | undefined,
): { minValue: number | null; maxValue: number | null } {
  const rules = item.rangeRules ?? [];
  if (
    selectedSlotIndex != null &&
    Number.isFinite(selectedSlotIndex) &&
    rules.length > 0
  ) {
    const matched = rules.find((r) => r.matchSlotIndex === selectedSlotIndex);
    if (matched) {
      return {
        minValue: matched.minValue ?? null,
        maxValue: matched.maxValue ?? null,
      };
    }
  }

  return {
    minValue: item.minValue ?? null,
    maxValue: item.maxValue ?? null,
  };
}
