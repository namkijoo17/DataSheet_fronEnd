import type { DatasheetItem } from '@/features/settings';

import {
  formatRangeHint,
  judgeNumberDetail,
  type InspectionAnswer,
} from './inspection-answers';

export type NgEventInfo = {
  /** 예: 규격 이탈 – 상한 초과 */
  title: string;
  itemLabel: string;
  measured: string;
  spec: string;
  /** 예: 상한 +0.15 (없으면 null) */
  deviation: string | null;
};

/** 현재 답변이 NG 인지 (수동 판정 우선, 숫자 항목은 규격으로 자동 판정) */
export function isNgAnswer(
  item: DatasheetItem,
  answer: InspectionAnswer | undefined,
  unitSlotIndex: number | null,
): boolean {
  if (!answer || answer.skipped) return false;
  if (answer.judgment === 'NG') return true;
  if (answer.judgment === 'OK') return false;
  if (item.inputType === 'NUMBER') {
    return judgeNumberDetail(item, answer.value ?? '', unitSlotIndex).result === 'NG';
  }
  return false;
}

function decimalsOf(raw: string) {
  const [, fraction = ''] = raw.trim().split('.');
  return fraction.length;
}

function formatDelta(delta: number, decimals: number) {
  return delta.toFixed(Math.min(Math.max(decimals, 0), 4));
}

/** NG 발생 팝업에 표시할 항목·측정값·규격·편차 */
export function buildNgEventInfo(
  item: DatasheetItem,
  answer: InspectionAnswer | undefined,
  unitSlotIndex: number | null,
): NgEventInfo {
  const specHint = formatRangeHint(item, unitSlotIndex);
  const spec = specHint ?? item.specDescription?.trim() ?? '-';

  if (item.inputType === 'NUMBER') {
    const raw = answer?.value ?? '';
    const detail = judgeNumberDetail(item, raw, unitSlotIndex);
    const unit = item.unit ? ` ${item.unit}` : '';
    const measured = raw.trim() ? `${raw.trim()}${unit}` : '-';
    const decimals = Math.max(decimalsOf(raw), 2);

    if (detail.value != null) {
      if (detail.maxValue != null && detail.value > detail.maxValue) {
        return {
          title: '규격 이탈 – 상한 초과',
          itemLabel: item.label,
          measured,
          spec,
          deviation: `상한 +${formatDelta(detail.value - detail.maxValue, decimals)}`,
        };
      }
      if (detail.minValue != null && detail.value < detail.minValue) {
        return {
          title: '규격 이탈 – 하한 미달',
          itemLabel: item.label,
          measured,
          spec,
          deviation: `하한 -${formatDelta(detail.minValue - detail.value, decimals)}`,
        };
      }
    }
    return { title: 'NG 판정', itemLabel: item.label, measured, spec, deviation: null };
  }

  return {
    title: 'NG 판정',
    itemLabel: item.label,
    measured: 'NG',
    spec,
    deviation: null,
  };
}
