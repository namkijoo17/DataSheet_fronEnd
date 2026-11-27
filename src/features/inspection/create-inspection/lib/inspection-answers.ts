import type { DatasheetItem } from '@/features/settings';
import { resolveItemRange } from '@/features/settings';

import type { InspectionModeId } from '../model/inspection-modes';
import type { NgAction } from '../model/ng-actions';

export type InspectionAnswer = {
  skipped?: boolean;
  /** 단일 값 (TEXT/NUMBER/MIXED) */
  value?: string;
  /** OK_NG / CHECK / CIRCLE 단일 선택 슬롯 */
  slotIndex?: number | null;
  /** 배열 슬롯별 값 */
  slotValues?: Record<number, string>;
  /** 수동/자동 판정 */
  judgment?: 'OK' | 'NG' | null;
  /** NG 발생 시 선택한 처리 방법 */
  ngAction?: NgAction | null;
  /** NG 발생 시각 (yyyy-MM-ddTHH:mm:ss) */
  ngOccurredAt?: string | null;
};

export type InspectionAnswers = Record<number, InspectionAnswer>;

export function emptyAnswer(): InspectionAnswer {
  return {};
}

export function isItemAnswered(
  item: DatasheetItem,
  answer: InspectionAnswer | undefined,
  mode: InspectionModeId,
): boolean {
  // SKIP 으로 표시된 항목(디버깅 모드의 미선택 포함)은 처리가 끝난 것으로 본다
  if (mode !== 'BASIC' && answer?.skipped) {
    return true;
  }
  if (!answer || answer.skipped) return false;

  if (item.inputType === 'OK_NG' || item.inputType === 'CIRCLE') {
    if (answer.judgment === 'OK' || answer.judgment === 'NG') return true;
    return answer.slotIndex != null;
  }

  if (item.inputType === 'CHECK') {
    if (answer.judgment === 'OK' || answer.judgment === 'NG') return true;
    if (answer.slotIndex != null) return true;
    // 불량 수리 내역처럼 여러 칸 체크
    return (item.slots ?? []).some((slot) =>
      Boolean(answer.slotValues?.[slot.slotIndex]?.trim()),
    );
  }

  if (item.inputType === 'NUMBER') {
    return Boolean(answer.value?.trim());
  }

  if (item.array && (item.slots?.length ?? 0) > 0) {
    const filledSlots = (item.slots ?? []).some((slot) =>
      Boolean(answer.slotValues?.[slot.slotIndex]?.trim()),
    );
    if (filledSlots) return true;
    return answer.judgment === 'OK' || answer.judgment === 'NG';
  }

  if (answer.value?.trim()) return true;
  return answer.judgment === 'OK' || answer.judgment === 'NG';
}

/** 결과표용 판정: 값만 있어도 확인된 항목은 OK로 표기 */
export function resolveDisplayJudgment(
  item: DatasheetItem,
  answer: InspectionAnswer | undefined,
  unitSlotIndex: number | null,
): 'OK' | 'NG' | 'SKIP' | null {
  if (!answer) return null;
  if (answer.skipped) return 'SKIP';
  if (answer.judgment === 'OK' || answer.judgment === 'NG') {
    return answer.judgment;
  }

  if (item.inputType === 'NUMBER') {
    const judged = judgeNumberDetail(item, answer.value ?? '', unitSlotIndex);
    if (judged.result === 'EMPTY') return null;
    return judged.result;
  }

  if (isItemAnswered(item, answer, 'BASIC')) {
    return 'OK';
  }
  return null;
}

export function isInspectionComplete(
  items: DatasheetItem[],
  answers: InspectionAnswers,
  mode: InspectionModeId,
) {
  // 필수가 아닌 항목은 비워 두거나 입력을 지워도 완료를 막지 않는다.
  // 디버깅 모드에서는 선택한 항목이 곧 해야 할 항목이므로 모두 입력해야 한다.
  return items.every((item) => {
    const mustAnswer = item.required || mode === 'DEBUG';
    return !mustAnswer || isItemAnswered(item, answers[item.id], mode);
  });
}

export function judgeNumberDetail(
  item: DatasheetItem,
  raw: string,
  unitSlotIndex: number | null,
) {
  const { minValue, maxValue } = resolveItemRange(item, unitSlotIndex);
  if (!raw.trim()) {
    return {
      result: 'EMPTY' as const,
      value: null as number | null,
      minValue,
      maxValue,
      deltaFromMin: null as number | null,
    };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return {
      result: 'NG' as const,
      value: null,
      minValue,
      maxValue,
      deltaFromMin: null,
    };
  }
  let result: 'OK' | 'NG' = 'OK';
  if (minValue != null && n < minValue) result = 'NG';
  if (maxValue != null && n > maxValue) result = 'NG';
  return {
    result,
    value: n,
    minValue,
    maxValue,
    deltaFromMin: minValue != null ? n - minValue : null,
  };
}

export function judgeNumber(
  item: DatasheetItem,
  raw: string,
  unitSlotIndex: number | null,
): 'OK' | 'NG' | 'EMPTY' {
  return judgeNumberDetail(item, raw, unitSlotIndex).result;
}

export function formatRangeHint(
  item: DatasheetItem,
  unitSlotIndex: number | null,
) {
  const { minValue, maxValue } = resolveItemRange(item, unitSlotIndex);
  const unit = item.unit ? ` ${item.unit}` : '';
  if (minValue != null && maxValue != null) {
    return `${minValue} ~ ${maxValue}${unit}`;
  }
  if (minValue != null) return `${minValue} 이상${unit}`;
  if (maxValue != null) return `${maxValue} 이하${unit}`;
  return unit.trim() || null;
}
