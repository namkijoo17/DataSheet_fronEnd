import { toPdfRegion } from '@/features/settings';
import type {
  DatasheetDetail,
  DatasheetItem,
  DatasheetItemSlot,
  DatasheetPdfRegion,
} from '@/features/settings/model/datasheet-types';

import type { BasicInfoFormValues } from './basic-info-fields';
import { PART_NUMBER_SLOTS } from './basic-info-fields';
import type { InspectionAnswer, InspectionAnswers } from './inspection-answers';
import { formatRangeHint, judgeNumberDetail } from './inspection-answers';
import { isInspectionItem } from './inspection-sequence';
import type { InspectionModeId } from '../model/inspection-modes';

export type OverlayKind = 'circle' | 'check' | 'text';

export type InspectionOverlay = {
  id: string;
  page: number;
  region: DatasheetPdfRegion;
  kind: OverlayKind;
  text?: string;
};

export type InspectionResultRow = {
  itemId: number;
  label: string;
  standard: string | null;
  measured: string | null;
  finalValue: string | null;
  judgment: 'OK' | 'NG' | 'SKIP' | null;
  highlightNg: boolean;
};

function regionOf(
  position: Pick<
    DatasheetItem | DatasheetItemSlot,
    'pdfPage' | 'posX' | 'posY' | 'posWidth' | 'posHeight'
  >,
  detail: Pick<DatasheetDetail, 'pageWidth' | 'pageHeight'>,
) {
  return toPdfRegion(position, detail.pageWidth, detail.pageHeight);
}

function findSlot(
  item: DatasheetItem,
  slotIndex: number | null | undefined,
): DatasheetItemSlot | null {
  if (slotIndex == null) return null;
  return (item.slots ?? []).find((s) => s.slotIndex === slotIndex) ?? null;
}

function findJudgmentSlot(
  item: DatasheetItem,
  judgment: 'OK' | 'NG',
): DatasheetItemSlot | null {
  const slots = item.slots ?? [];
  const matched = slots.find((slot) => {
    const label = slot.label.toUpperCase();
    if (judgment === 'NG') {
      return label.includes('NG') || slot.label.includes('불') || label === 'X';
    }
    return (
      label.includes('OK') ||
      slot.label.includes('양') ||
      label === 'O' ||
      label.includes('양호')
    );
  });
  if (matched) return matched;
  if (slots.length === 0) return null;
  if (judgment === 'OK') return slots[0];
  return slots[1] ?? slots[0];
}

function pushMark(
  marks: InspectionOverlay[],
  id: string,
  region: DatasheetPdfRegion | null,
  kind: OverlayKind,
  text?: string,
) {
  if (!region) return;
  marks.push({
    id,
    page: region.page,
    region,
    kind,
    text,
  });
}

function overlayForInspectionItem(
  item: DatasheetItem,
  answer: InspectionAnswer | undefined,
  detail: Pick<DatasheetDetail, 'pageWidth' | 'pageHeight'>,
  unitSlotIndex: number | null,
): InspectionOverlay[] {
  if (!answer || answer.skipped) return [];
  const marks: InspectionOverlay[] = [];

  if (
    item.inputType === 'OK_NG' ||
    item.inputType === 'CHECK' ||
    item.inputType === 'CIRCLE'
  ) {
    const judgment =
      answer.judgment === 'OK' || answer.judgment === 'NG'
        ? answer.judgment
        : null;
    const slot =
      findSlot(item, answer.slotIndex) ??
      (judgment ? findJudgmentSlot(item, judgment) : null);

    if (slot) {
      const kind: OverlayKind =
        item.inputType === 'CHECK' ? 'check' : 'circle';
      pushMark(
        marks,
        `item-${item.id}-slot-${slot.slotIndex}`,
        regionOf(slot, detail),
        kind,
      );
      return marks;
    }

    if (judgment) {
      pushMark(
        marks,
        `item-${item.id}-judgment`,
        regionOf(item, detail),
        item.inputType === 'CHECK' ? 'check' : 'circle',
      );
    }
    return marks;
  }

  if (item.inputType === 'NUMBER') {
    const raw = answer.value?.trim() ?? '';
    if (!raw) return marks;
    const judged = judgeNumberDetail(item, raw, unitSlotIndex);
    const display =
      judged.value != null
        ? String(judged.value)
        : raw;
    const withUnit = item.unit ? `${display}` : display;
    pushMark(
      marks,
      `item-${item.id}-value`,
      regionOf(item, detail),
      'text',
      withUnit,
    );
    return marks;
  }

  if (item.array && (item.slots?.length ?? 0) > 0) {
    for (const slot of item.slots ?? []) {
      const value = answer.slotValues?.[slot.slotIndex]?.trim();
      if (!value) continue;
      pushMark(
        marks,
        `item-${item.id}-slot-${slot.slotIndex}`,
        regionOf(slot, detail),
        'text',
        value,
      );
    }
    return marks;
  }

  const value = answer.value?.trim();
  if (value) {
    pushMark(
      marks,
      `item-${item.id}-value`,
      regionOf(item, detail),
      'text',
      value,
    );
  }
  return marks;
}

function matchBasicItem(
  items: DatasheetItem[],
  predicates: Array<(item: DatasheetItem) => boolean>,
) {
  for (const pred of predicates) {
    const found = items.find((item) => !isInspectionItem(item) && pred(item));
    if (found) return found;
  }
  return null;
}

function overlaysForBasicInfo(
  items: DatasheetItem[],
  basic: BasicInfoFormValues,
  detail: Pick<DatasheetDetail, 'pageWidth' | 'pageHeight'>,
): InspectionOverlay[] {
  const marks: InspectionOverlay[] = [];

  const placeText = (item: DatasheetItem | null, id: string, text: string) => {
    if (!item || !text.trim()) return;
    if (item.array && (item.slots?.length ?? 0) > 0) {
      // 검사일 년/월/일 등
      const parts = text.includes('-')
        ? text.split('-')
        : text.includes('/')
          ? text.split('/')
          : [text];
      (item.slots ?? []).forEach((slot, index) => {
        const part = parts[index]?.trim();
        if (!part) return;
        pushMark(
          marks,
          `${id}-slot-${slot.slotIndex}`,
          regionOf(slot, detail),
          'text',
          part,
        );
      });
      return;
    }
    pushMark(marks, id, regionOf(item, detail), 'text', text.trim());
  };

  const placeCheckOnMatchingSlot = (
    item: DatasheetItem | null,
    id: string,
    label: string,
  ) => {
    if (!item || !label.trim()) return;
    const slot = (item.slots ?? []).find(
      (s) => s.label === label || s.label.includes(label),
    );
    if (slot) {
      pushMark(
        marks,
        `${id}-slot-${slot.slotIndex}`,
        regionOf(slot, detail),
        item.inputType === 'CIRCLE' ? 'circle' : 'check',
      );
      return;
    }
    placeText(item, id, label);
  };

  placeText(
    matchBasicItem(items, [
      (i) => i.label.includes('기번'),
      (i) => i.label.toLowerCase().includes('serial'),
    ]),
    'basic-serial',
    basic.serialNo,
  );

  placeCheckOnMatchingSlot(
    matchBasicItem(items, [
      (i) => i.label.includes('유닛'),
      (i) => i.label.includes('유니트'),
      (i) => i.label.toLowerCase().includes('unit'),
    ]),
    'basic-unit',
    basic.unit,
  );

  placeText(
    matchBasicItem(items, [
      (i) => i.label.includes('라인'),
      (i) => i.label.toLowerCase().includes('line'),
    ]),
    'basic-line',
    basic.line,
  );

  placeText(
    matchBasicItem(items, [(i) => i.label.includes('검사일')]),
    'basic-date',
    basic.inspectDate,
  );

  placeText(
    matchBasicItem(items, [
      (i) => i.label.includes('검사자'),
      (i) => i.label.includes('담당'),
    ]),
    'basic-inspector',
    basic.inspector,
  );

  placeText(
    matchBasicItem(items, [(i) => i.label.includes('온도')]),
    'basic-temp',
    basic.temperature,
  );

  placeText(
    matchBasicItem(items, [(i) => i.label.includes('습도')]),
    'basic-humidity',
    basic.humidity,
  );

  for (const slotKey of PART_NUMBER_SLOTS) {
    const value = basic.parts[slotKey];
    if (!value.trim()) continue;
    const item = matchBasicItem(items, [
      (i) => i.label === slotKey,
      (i) => i.label.includes(slotKey),
    ]);
    placeText(item, `basic-part-${slotKey}`, value);
  }

  // WORKER1 등 검사자 보조 필드
  const worker = matchBasicItem(items, [
    (i) => i.label.toUpperCase().includes('WORKER'),
  ]);
  if (worker && basic.inspector.trim()) {
    placeText(worker, 'basic-worker', basic.inspector);
  }

  return marks;
}

export function resolveUnitSlotIndex(
  items: DatasheetItem[],
  unitLabel: string,
): number | null {
  const unitItem = items.find(
    (item) =>
      !isInspectionItem(item) &&
      item.array &&
      (item.inputType === 'CHECK' || item.inputType === 'CIRCLE') &&
      (item.label.includes('유닛') ||
        item.label.includes('유니트') ||
        item.label.toLowerCase().includes('unit')),
  );
  if (!unitItem || !unitLabel) return null;
  return (
    (unitItem.slots ?? []).find((s) => s.label === unitLabel)?.slotIndex ?? null
  );
}

export function buildInspectionOverlays(params: {
  items: DatasheetItem[];
  answers: InspectionAnswers;
  basic: BasicInfoFormValues;
  detail: Pick<DatasheetDetail, 'pageWidth' | 'pageHeight'>;
}): InspectionOverlay[] {
  const { items, answers, basic, detail } = params;
  const unitSlotIndex = resolveUnitSlotIndex(items, basic.unit);
  const marks: InspectionOverlay[] = [
    ...overlaysForBasicInfo(items, basic, detail),
  ];

  for (const item of items) {
    if (!isInspectionItem(item)) continue;
    marks.push(
      ...overlayForInspectionItem(
        item,
        answers[item.id],
        detail,
        unitSlotIndex,
      ),
    );
  }

  return marks;
}

export function buildInspectionResultRows(params: {
  items: DatasheetItem[];
  answers: InspectionAnswers;
  unitSlotIndex: number | null;
  mode: InspectionModeId;
}): InspectionResultRow[] {
  const { items, answers, unitSlotIndex } = params;
  return items
    .filter(isInspectionItem)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.itemNo - b.itemNo;
    })
    .map((item) => {
      const answer = answers[item.id];
      if (answer?.skipped) {
        return {
          itemId: item.id,
          label: item.label,
          standard: formatRangeHint(item, unitSlotIndex),
          measured: null,
          finalValue: null,
          judgment: 'SKIP' as const,
          highlightNg: false,
        };
      }

      if (item.inputType === 'NUMBER') {
        const judged = judgeNumberDetail(
          item,
          answer?.value ?? '',
          unitSlotIndex,
        );
        const judgment =
          judged.result === 'EMPTY'
            ? answer?.judgment ?? null
            : judged.result;
        return {
          itemId: item.id,
          label: item.label,
          standard: formatRangeHint(item, unitSlotIndex),
          measured: answer?.value?.trim() || null,
          finalValue:
            judged.value != null ? String(judged.value) : answer?.value ?? null,
          judgment,
          highlightNg: judgment === 'NG',
        };
      }

      const judgment =
        answer?.judgment === 'OK' || answer?.judgment === 'NG'
          ? answer.judgment
          : null;

      let measured: string | null = null;
      if (answer?.slotIndex != null) {
        measured =
          (item.slots ?? []).find((s) => s.slotIndex === answer.slotIndex)
            ?.label ?? null;
      } else if (answer?.value?.trim()) {
        measured = answer.value.trim();
      } else if (answer?.slotValues) {
        measured = Object.values(answer.slotValues)
          .filter(Boolean)
          .join(', ');
      } else {
        measured = judgment;
      }

      return {
        itemId: item.id,
        label: item.label,
        standard: formatRangeHint(item, unitSlotIndex),
        measured,
        finalValue: measured,
        judgment,
        highlightNg: judgment === 'NG',
      };
    });
}

export function summarizeResults(rows: InspectionResultRow[]) {
  let ok = 0;
  let ng = 0;
  let skip = 0;
  for (const row of rows) {
    if (row.judgment === 'OK') ok += 1;
    else if (row.judgment === 'NG') ng += 1;
    else if (row.judgment === 'SKIP') skip += 1;
  }
  return { ok, ng, skip, total: rows.length, done: ok + ng + skip };
}
