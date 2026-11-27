import type { DatasheetItem } from '@/features/settings';

import type { InspectionAnswer } from './inspection-answers';

const MAX_LENGTH = 300;

/**
 * 재검사 이력에 남길, 지우기 전 입력값 요약 (예: "값 12.3 mm · NG").
 * 입력된 내용이 없으면 null.
 */
export function summarizeAnswerForLog(
  item: DatasheetItem,
  answer: InspectionAnswer | undefined,
): string | null {
  if (!answer || answer.skipped) return null;

  const parts: string[] = [];

  const value = answer.value?.trim();
  if (value) parts.push(`값 ${value}${item.unit ? ` ${item.unit}` : ''}`);

  const slots = item.slots ?? [];
  const filledSlots = Object.entries(answer.slotValues ?? {})
    .filter(([, slotValue]) => slotValue?.trim())
    .map(([slotIndex, slotValue]) => {
      const label = slots.find((slot) => slot.slotIndex === Number(slotIndex))?.label;
      return label ? `${label}: ${slotValue.trim()}` : slotValue.trim();
    });
  if (filledSlots.length > 0) parts.push(filledSlots.join(', '));

  if (answer.slotIndex != null) {
    const label = slots.find((slot) => slot.slotIndex === answer.slotIndex)?.label;
    if (label) parts.push(label);
  }

  if (answer.judgment) parts.push(answer.judgment);

  if (parts.length === 0) return null;
  return parts.join(' · ').slice(0, MAX_LENGTH);
}
