import type { DatasheetItem } from '@/features/settings';

import type { InspectionAnswers } from './inspection-answers';
import { isInspectionItem } from './inspection-sequence';
import { isNgAnswer } from './ng-event';

/**
 * 처리 방법이 확정되지 않은 NG 항목 수.
 * NG 인데 처리 방법을 아직 고르지 않았거나, 재검증 중(RECHECK)이면 미처리로 본다.
 * CONTINUE / END 로 처리된 NG 는 제외한다.
 */
export function countUnresolvedNg(
  items: DatasheetItem[],
  answers: InspectionAnswers,
  unitSlotIndex: number | null,
): number {
  return items.filter((item) => {
    if (!isInspectionItem(item)) return false;
    const answer = answers[item.id];
    if (!isNgAnswer(item, answer, unitSlotIndex)) return false;
    return !answer?.ngAction || answer.ngAction === 'RECHECK';
  }).length;
}
