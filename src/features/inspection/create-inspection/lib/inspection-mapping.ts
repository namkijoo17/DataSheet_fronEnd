import {
  emptyBasicInfoValues,
  PART_NUMBER_SLOTS,
  type BasicInfoFormValues,
} from './basic-info-fields';
import type { InspectionAnswer, InspectionAnswers } from './inspection-answers';
import type {
  InspectionAnswerPayload,
  InspectionBasicPayload,
  InspectionDetailResponse,
} from '../model/inspection-types';

export function toBasicPayload(values: BasicInfoFormValues): InspectionBasicPayload {
  return {
    serialNo: values.serialNo,
    unit: values.unit,
    line: values.line,
    inspectDate: values.inspectDate || null,
    inspector: values.inspector,
    inspectorChangeReason: values.inspectorChangeReason,
    temperature: values.temperature,
    humidity: values.humidity,
    parts: { ...values.parts },
  };
}

export function fromBasicPayload(
  basic: InspectionBasicPayload,
  fallbackInspector = '',
): BasicInfoFormValues {
  const base = emptyBasicInfoValues(basic.inspector ?? fallbackInspector);
  const parts = { ...base.parts };
  for (const slot of PART_NUMBER_SLOTS) {
    parts[slot] = basic.parts?.[slot] ?? '';
  }
  return {
    ...base,
    serialNo: basic.serialNo ?? '',
    unit: basic.unit ?? '',
    line: basic.line ?? '',
    inspectDate: basic.inspectDate ?? base.inspectDate,
    inspectorChangeReason: basic.inspectorChangeReason ?? '',
    temperature: basic.temperature ?? '',
    humidity: basic.humidity ?? '',
    parts,
  };
}

/** 답변이 없으면(재검사로 삭제) 빈 페이로드 → 서버에서 삭제된다 */
export function toAnswerPayload(
  answer: InspectionAnswer | undefined,
): InspectionAnswerPayload {
  return {
    skipped: Boolean(answer?.skipped),
    value: answer?.value ?? null,
    slotIndex: answer?.slotIndex ?? null,
    judgment: answer?.judgment ?? null,
    slotValues: answer?.slotValues ?? {},
    ngAction: answer?.ngAction ?? null,
    ngOccurredAt: answer?.ngOccurredAt ?? null,
  };
}

export function fromAnswersResponse(
  answers: InspectionDetailResponse['answers'],
): InspectionAnswers {
  const result: InspectionAnswers = {};
  for (const [key, answer] of Object.entries(answers ?? {})) {
    const itemId = Number(key);
    const slotValues: Record<number, string> = {};
    for (const [slot, value] of Object.entries(answer.slotValues ?? {})) {
      slotValues[Number(slot)] = value;
    }
    result[itemId] = {
      skipped: answer.skipped || undefined,
      value: answer.value ?? undefined,
      slotIndex: answer.slotIndex,
      judgment: answer.judgment,
      slotValues: Object.keys(slotValues).length > 0 ? slotValues : undefined,
      ngAction: answer.ngAction,
      ngOccurredAt: answer.ngOccurredAt,
    };
  }
  return result;
}

/** 두 답변 맵에서 달라진(참조가 바뀐) 항목 ID */
export function diffAnswerItemIds(
  prev: InspectionAnswers,
  next: InspectionAnswers,
): number[] {
  const ids = new Set<number>([
    ...Object.keys(prev).map(Number),
    ...Object.keys(next).map(Number),
  ]);
  return [...ids].filter((id) => prev[id] !== next[id]);
}
