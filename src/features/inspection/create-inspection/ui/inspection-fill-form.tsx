'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

import {
  normalizeDatasheetItems,
  resolveItemRange,
  useDatasheetDetail,
  type DatasheetItem,
} from '@/features/settings';
import { cn } from '@/shared/lib/utils';

import {
  formatRangeHint,
  isInspectionComplete,
  isItemAnswered,
  judgeNumberDetail,
  type InspectionAnswer,
  type InspectionAnswers,
} from '../lib/inspection-answers';
import { isInspectionItem } from '../lib/inspection-sequence';
import type { InspectionModeId } from '../model/inspection-modes';
import { INSPECTION_MODES } from '../model/inspection-modes';

function listInspectionItems(items: DatasheetItem[]) {
  return items.filter(isInspectionItem).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.itemNo - b.itemNo;
  });
}

type InspectionFillFormProps = {
  datasheetId: number;
  datasheetLabel: string;
  serialNo: string;
  unitLabel: string;
  mode: InspectionModeId;
  answers: InspectionAnswers;
  onChange: (answers: InspectionAnswers) => void;
  onBack: () => void;
  onComplete: () => void;
};

function patchAnswer(
  answers: InspectionAnswers,
  itemId: number,
  patch: Partial<InspectionAnswer>,
): InspectionAnswers {
  return {
    ...answers,
    [itemId]: { ...answers[itemId], ...patch, skipped: false },
  };
}

/** OK/NG 버튼 선택 시 배열 슬롯(OK/NG 좌표)이 있으면 slotIndex도 함께 맞춤 */
function judgmentPatch(
  item: DatasheetItem,
  judgment: 'OK' | 'NG',
  answer: InspectionAnswer | undefined,
): Partial<InspectionAnswer> {
  const patch: Partial<InspectionAnswer> = { judgment };
  if (
    item.array &&
    (item.inputType === 'OK_NG' ||
      item.inputType === 'CHECK' ||
      item.inputType === 'CIRCLE') &&
    (item.slots?.length ?? 0) > 0
  ) {
    const matched = (item.slots ?? []).find((slot) => {
      const label = slot.label.toUpperCase();
      if (judgment === 'NG') {
        return label.includes('NG') || slot.label.includes('불');
      }
      return label.includes('OK') || slot.label.includes('양') || label === 'O';
    });
    if (matched) {
      patch.slotIndex = matched.slotIndex;
    } else if (answer?.slotIndex == null && judgment === 'OK') {
      patch.slotIndex = item.slots![0].slotIndex;
    } else if (answer?.slotIndex == null && judgment === 'NG' && item.slots!.length > 1) {
      patch.slotIndex = item.slots![1].slotIndex;
    }
  }
  return patch;
}

export function InspectionFillForm({
  datasheetId,
  datasheetLabel,
  serialNo,
  unitLabel,
  mode,
  answers,
  onChange,
  onBack,
  onComplete,
}: InspectionFillFormProps) {
  const { data, isPending, isError, error, refetch } =
    useDatasheetDetail(datasheetId);
  const [index, setIndex] = useState(0);
  const [jumpOpen, setJumpOpen] = useState(false);

  const items = useMemo(
    () => listInspectionItems(normalizeDatasheetItems(data?.items ?? [])),
    [data],
  );

  const unitSlotIndex = useMemo(() => {
    const all = normalizeDatasheetItems(data?.items ?? []);
    const unitItem = all.find(
      (item) =>
        !item.inspectionItem &&
        item.array &&
        (item.inputType === 'CHECK' || item.inputType === 'CIRCLE') &&
        (item.label.includes('유닛') ||
          item.label.includes('유니트') ||
          item.label.toLowerCase().includes('unit')),
    );
    if (!unitItem || !unitLabel) return null;
    const slot = (unitItem.slots ?? []).find((s) => s.label === unitLabel);
    return slot?.slotIndex ?? null;
  }, [data, unitLabel]);

  useEffect(() => {
    if (items.length === 0) return;
    if (index > items.length - 1) setIndex(items.length - 1);
  }, [items.length, index]);

  const current = items[index] ?? null;
  const prev = index > 0 ? items[index - 1] : null;
  const next = index < items.length - 1 ? items[index + 1] : null;
  const answer = current ? answers[current.id] : undefined;

  const percent =
    items.length === 0
      ? 0
      : Math.round(((index + 1) / items.length) * 100);
  const complete = isInspectionComplete(items, answers, mode);
  const modeTitle =
    INSPECTION_MODES.find((entry) => entry.id === mode)?.title ?? '검사';

  const goNext = () => {
    if (index < items.length - 1) {
      setIndex(index + 1);
      return;
    }
    if (complete) onComplete();
  };

  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  const resetCurrent = () => {
    if (!current) return;
    const nextAnswers = { ...answers };
    delete nextAnswers[current.id];
    onChange(nextAnswers);
  };

  const updateCurrent = (patch: Partial<InspectionAnswer>) => {
    if (!current) return;
    onChange(patchAnswer(answers, current.id, patch));
  };

  if (isPending) {
    return (
      <CenterMessage text="검사 항목을 불러오는 중..." onBack={onBack} />
    );
  }

  if (isError) {
    return (
      <CenterMessage
        text={
          error instanceof Error
            ? error.message
            : '검사 항목을 불러오지 못했습니다.'
        }
        actionLabel="다시 시도"
        onAction={() => void refetch()}
        onBack={onBack}
      />
    );
  }

  if (!current) {
    return (
      <CenterMessage text="검사 항목이 없습니다." onBack={onBack} />
    );
  }

  const range = resolveItemRange(current, unitSlotIndex);
  const rangeHint = formatRangeHint(current, unitSlotIndex);
  const numberDetail =
    current.inputType === 'NUMBER'
      ? judgeNumberDetail(current, answer?.value ?? '', unitSlotIndex)
      : null;
  const effectiveJudgment =
    answer?.judgment ??
    (numberDetail && numberDetail.result !== 'EMPTY'
      ? numberDetail.result
      : null);

  const isJudgmentType =
    current.inputType === 'OK_NG' ||
    current.inputType === 'CHECK' ||
    current.inputType === 'CIRCLE';
  const judgmentSlots = current.slots ?? [];
  const hasOkNgSlots =
    isJudgmentType &&
    current.array &&
    judgmentSlots.length > 0 &&
    judgmentSlots.every((slot) => {
      const label = slot.label.toUpperCase();
      return (
        label.includes('OK') ||
        label.includes('NG') ||
        label === 'O' ||
        label === 'X' ||
        slot.label.includes('양') ||
        slot.label.includes('불')
      );
    });
  // 선택지가 OK/NG가 아닌 배열(CIRCLE 등)만 슬롯 버튼, OK/NG는 한 줄만
  const showChoiceSlots =
    isJudgmentType &&
    current.array &&
    judgmentSlots.length > 0 &&
    !hasOkNgSlots;
  const showOkNg = isJudgmentType && !showChoiceSlots;

  return (
    <div className="flex h-svh min-h-0 flex-col bg-[#f4f6f8]">
      {/* Header */}
      <header className="shrink-0 border-b border-[#e8eaed] bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex size-9 items-center justify-center rounded-lg text-[#1f1f1f] hover:bg-[#f5f6f7]"
            aria-label="뒤로"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-[#1f1f1f]">
                {serialNo || '기번 없음'}
              </p>
              <span className="rounded-md bg-[#eceff3] px-1.5 py-0.5 text-[10px] font-semibold text-[#5f6368]">
                {modeTitle}
              </span>
            </div>
          </div>
          <div className="min-w-[7rem] text-right">
            <p className="text-xs font-semibold text-[#1f1f1f]">
              {index + 1} / {items.length} · {percent}%
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e8eaed]">
              <div
                className="h-full rounded-full bg-[#3c3c3c] transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            className="ml-1 rounded-lg border border-[#d8dce3] px-2.5 py-1.5 text-xs font-semibold text-[#5f6368]"
            onClick={() => window.alert('보류 기능은 준비 중입니다.')}
          >
            보류
          </button>
        </div>
      </header>

      {/* Prev / Next strip */}
      <div className="grid shrink-0 grid-cols-2 gap-px border-b border-[#e8eaed] bg-[#e8eaed]">
        <button
          type="button"
          disabled={!prev}
          onClick={goPrev}
          className="bg-white px-3 py-2.5 text-left disabled:opacity-40"
        >
          <p className="text-[11px] font-semibold text-[#8b8f96]">
            ◀ 이전 · {prev ? `${index}/${items.length}` : '-'}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[#1f1f1f]">
            {prev?.label ?? '없음'}
          </p>
          {prev && answers[prev.id]?.judgment && (
            <p
              className={cn(
                'mt-0.5 text-xs font-bold',
                answers[prev.id]?.judgment === 'OK'
                  ? 'text-[#166534]'
                  : 'text-[#b91c1c]',
              )}
            >
              {answers[prev.id]?.judgment}
            </p>
          )}
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={goNext}
          className="bg-white px-3 py-2.5 text-right disabled:opacity-40"
        >
          <p className="text-[11px] font-semibold text-[#8b8f96]">
            다음 ▶ · {next ? `${index + 2}/${items.length}` : '-'}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[#1f1f1f]">
            {next?.label ?? '없음'}
          </p>
          {next && formatRangeHint(next, unitSlotIndex) && (
            <p className="mt-0.5 truncate text-[11px] text-[#8b8f96]">
              {formatRangeHint(next, unitSlotIndex)}
            </p>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section>
          <p className="text-xs font-semibold text-[#8b8f96]">
            {current.itemNo != null ? `${current.itemNo}` : `${index + 1}`}
            {datasheetLabel ? ` · ${datasheetLabel}` : ''}
            {' · '}
            {index + 1} / {items.length}
            {unitLabel ? ` · ${unitLabel}` : ''}
          </p>
          <h2 className="mt-1 text-xl font-bold leading-snug text-[#1f1f1f]">
            {current.label}
            {rangeHint ? ` — ${rangeHint}` : ''}
          </h2>
          {current.groupName ? (
            <p className="mt-1 text-sm text-[#8b8f96]">{current.groupName}</p>
          ) : null}
        </section>

        {current.inputType === 'NUMBER' && (
          <>
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white px-3 py-3">
              <Metric
                label="하한"
                value={range.minValue == null ? '없음' : String(range.minValue)}
              />
              <Metric
                label="상한"
                value={range.maxValue == null ? '없음' : String(range.maxValue)}
              />
              <Metric
                label="단위 · 소수점"
                value={`${current.unit ?? '-'} · ${current.decimalPlaces ?? 0}`}
              />
            </div>

            <section className="space-y-2">
              <p className="text-sm font-bold text-[#1f1f1f]">측정값</p>
              <label className="flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-[#e8eaed] bg-white px-4 py-3">
                <span className="shrink-0 text-sm text-[#9aa0a6]">
                  {answer?.value ? '측정값' : '탭하여 키패드 열기'}
                </span>
                <input
                  value={answer?.value ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const judged = judgeNumberDetail(
                      current,
                      value,
                      unitSlotIndex,
                    );
                    updateCurrent({
                      value,
                      judgment:
                        judged.result === 'EMPTY' ? null : judged.result,
                    });
                  }}
                  inputMode="decimal"
                  className="w-full max-w-[50%] bg-transparent text-right text-3xl font-bold text-[#1f1f1f] outline-none"
                  placeholder="0"
                />
              </label>

              {numberDetail &&
                numberDetail.result !== 'EMPTY' &&
                numberDetail.value != null && (
                  <div
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold',
                      numberDetail.result === 'OK'
                        ? 'bg-[#ecfdf3] text-[#166534]'
                        : 'bg-[#fef2f2] text-[#b91c1c]',
                    )}
                  >
                    <p className="min-w-0 truncate">
                      측정값 {numberDetail.value}
                      {current.unit ? ` ${current.unit}` : ''}
                      {numberDetail.deltaFromMin != null
                        ? ` · 하한 대비 ${numberDetail.deltaFromMin >= 0 ? '+' : ''}${numberDetail.deltaFromMin}`
                        : ''}
                    </p>
                    <span className="shrink-0 font-bold">
                      {numberDetail.result}
                    </span>
                  </div>
                )}
            </section>
          </>
        )}

        {showChoiceSlots && (
          <div className="grid grid-cols-2 gap-2">
            {judgmentSlots.map((slot) => {
              const active = answer?.slotIndex === slot.slotIndex;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() =>
                    updateCurrent({
                      slotIndex: slot.slotIndex,
                      judgment:
                        slot.label.toUpperCase().includes('NG') ||
                        slot.label.includes('불')
                          ? 'NG'
                          : 'OK',
                    })
                  }
                  className={cn(
                    'h-14 rounded-2xl px-3 text-lg font-bold transition-colors',
                    active
                      ? 'bg-[#3c3c3c] text-white'
                      : 'border-2 border-[#d8dce3] bg-white text-[#1f1f1f]',
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}

        {(current.inputType === 'TEXT' || current.inputType === 'MIXED') &&
          current.array &&
          (current.slots?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {(current.slots ?? []).map((slot) => (
                <label
                  key={slot.id}
                  className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-[#e8eaed] bg-white px-4"
                >
                  <span className="w-16 shrink-0 text-sm font-semibold text-[#8b8f96]">
                    {slot.label}
                  </span>
                  <input
                    value={answer?.slotValues?.[slot.slotIndex] ?? ''}
                    onChange={(e) =>
                      updateCurrent({
                        slotValues: {
                          ...answer?.slotValues,
                          [slot.slotIndex]: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-transparent text-base font-semibold text-[#1f1f1f] outline-none"
                    placeholder="입력"
                  />
                </label>
              ))}
            </div>
          )}

        {(current.inputType === 'TEXT' || current.inputType === 'MIXED') &&
          !current.array && (
            <label className="flex min-h-[72px] items-center rounded-2xl border border-[#e8eaed] bg-white px-4">
              <input
                value={answer?.value ?? ''}
                onChange={(e) => updateCurrent({ value: e.target.value })}
                className="w-full bg-transparent text-lg font-semibold text-[#1f1f1f] outline-none"
                placeholder="입력"
              />
            </label>
          )}

        {showOkNg && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                updateCurrent(judgmentPatch(current, 'OK', answer))
              }
              className={cn(
                'h-14 rounded-2xl border-2 text-lg font-bold transition-colors',
                effectiveJudgment === 'OK'
                  ? 'border-[#166534] bg-[#ecfdf3] text-[#166534]'
                  : 'border-[#d8dce3] bg-white text-[#166534]',
              )}
            >
              OK
            </button>
            <button
              type="button"
              onClick={() =>
                updateCurrent(judgmentPatch(current, 'NG', answer))
              }
              className={cn(
                'h-14 rounded-2xl border-2 text-lg font-bold transition-colors',
                effectiveJudgment === 'NG'
                  ? 'border-[#b91c1c] bg-[#fef2f2] text-[#b91c1c]'
                  : 'border-[#d8dce3] bg-white text-[#b91c1c]',
              )}
            >
              NG
            </button>
          </div>
        )}

        {mode === 'PARTS_SHIPPING' && current.skippable && (
          <button
            type="button"
            onClick={() => {
              onChange({
                ...answers,
                [current.id]: { skipped: true },
              });
            }}
            className="w-full rounded-xl bg-[#f5f6f7] py-3 text-sm font-semibold text-[#5f6368]"
          >
            이 항목 SKIP
          </button>
        )}
      </div>

      {/* Bottom */}
      <div className="shrink-0 border-t border-[#e8eaed] bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={!prev}
            className="h-12 rounded-xl border border-[#d8dce3] bg-white text-sm font-semibold text-[#1f1f1f] disabled:opacity-40"
          >
            이전
          </button>
          <button
            type="button"
            onClick={() => setJumpOpen(true)}
            className="h-12 rounded-xl border border-[#d8dce3] bg-white text-sm font-semibold text-[#1f1f1f]"
          >
            항목 이동
          </button>
          <button
            type="button"
            onClick={resetCurrent}
            className="h-12 rounded-xl border border-[#d8dce3] bg-white text-sm font-semibold text-[#1f1f1f]"
          >
            재검사
          </button>
          <button
            type="button"
            onClick={() => {
              if (index >= items.length - 1) {
                if (complete) onComplete();
                else window.alert('아직 입력하지 않은 항목이 있습니다.');
                return;
              }
              goNext();
            }}
            className="h-12 rounded-xl bg-[#3c3c3c] text-sm font-bold text-white"
          >
            {index >= items.length - 1 ? '완료' : '다음 항목'}
          </button>
        </div>
      </div>

      {jumpOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="max-h-[70svh] w-full overflow-hidden rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#eceef1] px-4 py-3">
              <p className="font-bold text-[#1f1f1f]">항목 이동</p>
              <button
                type="button"
                onClick={() => setJumpOpen(false)}
                className="text-sm font-semibold text-[#5f6368]"
              >
                닫기
              </button>
            </div>
            <ul className="max-h-[55svh] overflow-y-auto p-2">
              {items.map((item, i) => {
                const done = isItemAnswered(item, answers[item.id], mode);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setIndex(i);
                        setJumpOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left',
                        i === index ? 'bg-[#f5f6f7]' : 'hover:bg-[#fafafa]',
                      )}
                    >
                      <span className="w-6 text-sm font-bold text-[#8b8f96]">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1f1f1f]">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          'text-xs font-bold',
                          done ? 'text-[#166534]' : 'text-[#9aa0a6]',
                        )}
                      >
                        {done ? '완료' : '미입력'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-[#8b8f96]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-[#1f1f1f]">{value}</p>
    </div>
  );
}

function CenterMessage({
  text,
  onBack,
  actionLabel,
  onAction,
}: {
  text: string;
  onBack: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-svh flex-col bg-[#f4f6f8]">
      <header className="flex items-center gap-2 border-b border-[#e8eaed] bg-white px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-lg"
          aria-label="뒤로"
        >
          <ChevronLeft className="size-6" />
        </button>
        <h1 className="text-lg font-bold">검사</h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-[#8b8f96]">{text}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="text-sm font-semibold underline"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
