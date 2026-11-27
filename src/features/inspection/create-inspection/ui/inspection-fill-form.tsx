'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import dayjs from 'dayjs';

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
import type { SaveStatus } from '../lib/inspection-save-queue';
import { isInspectionItem } from '../lib/inspection-sequence';
import { summarizeAnswerForLog } from '../lib/answer-summary';
import { buildNgEventInfo, isNgAnswer } from '../lib/ng-event';
import type { InspectionModeId } from '../model/inspection-modes';
import { INSPECTION_MODES } from '../model/inspection-modes';
import type { NgAction } from '../model/ng-actions';
import { NgOccurredDialog } from './ng-occurred-dialog';
import { RecheckReasonDialog } from './recheck-reason-dialog';

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
  /** 보류: 저장된 상태로 검사를 나간다 */
  onHold?: () => void;
  /** 항목 재검사 사유를 서버에 기록한다. 실패하면 throw (재검사는 진행되지 않음) */
  onRecheckReason: (payload: {
    itemId: number;
    itemLabel: string;
    reason: string;
    previousSummary: string | null;
  }) => Promise<void>;
  /** 서버 저장 상태 표시 */
  saveStatus?: SaveStatus;
  /** 이어하기: 처음 열 때 첫 미입력 항목으로 이동 */
  startAtFirstUnanswered?: boolean;
};

const SAVE_STATUS_LABEL: Record<SaveStatus, { text: string; className: string }> = {
  idle: { text: '저장됨', className: 'text-[#8b8f96]' },
  saving: { text: '저장 중…', className: 'text-[#5f6368]' },
  retrying: { text: '저장 재시도 중…', className: 'text-[#b45309]' },
  error: { text: '저장 실패', className: 'text-[#b91c1c]' },
};

function patchAnswer(
  answers: InspectionAnswers,
  itemId: number,
  patch: Partial<InspectionAnswer>,
): InspectionAnswers {
  return {
    ...answers,
    // 값을 고치면 이전 NG 처리 이력은 무효 → 다시 NG면 처리 방법을 새로 선택
    [itemId]: {
      ...answers[itemId],
      ...patch,
      skipped: false,
      ngAction: null,
      ngOccurredAt: null,
    },
  };
}

function nowStamp() {
  return dayjs().format('YYYY-MM-DDTHH:mm:ss');
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
    (item.inputType === 'OK_NG' || item.inputType === 'CHECK' || item.inputType === 'CIRCLE') &&
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
  onHold,
  onRecheckReason,
  saveStatus = 'idle',
  startAtFirstUnanswered = false,
}: InspectionFillFormProps) {
  const { data, isPending, isError, error, refetch } = useDatasheetDetail(datasheetId);
  const [rawIndex, setIndex] = useState(0);
  const [positioned, setPositioned] = useState(!startAtFirstUnanswered);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [autoNext] = useState(true);
  /** NG 발생 팝업 (해당 항목과 발생 시각) */
  const [ngOpen, setNgOpen] = useState<{ itemId: number; occurredAt: string } | null>(null);
  /** 재검사 사유 입력 팝업 */
  const [recheckOpen, setRecheckOpen] = useState(false);
  const [recheckSaving, setRecheckSaving] = useState(false);
  /** 'NG 항목만 재검증'을 이미 선택한 항목 (같은 항목에서 다시 고를 수 없음) */
  const [recheckedIds, setRecheckedIds] = useState<Set<number>>(() => new Set());

  const allItems = useMemo(
    () => listInspectionItems(normalizeDatasheetItems(data?.items ?? [])),
    [data],
  );
  // 디버깅 모드: 고르지 않은 항목(SKIP)은 검사 순서에서 뺀다
  const items = useMemo(
    () =>
      mode === 'DEBUG'
        ? allItems.filter((item) => !answers[item.id]?.skipped)
        : allItems,
    [allItems, mode, answers],
  );
  /** 필수가 아니어서 비워 둘 수 있는 항목 (디버깅 모드는 고른 항목이 모두 대상) */
  const isOptionalItem = (item: DatasheetItem) => !item.required && mode !== 'DEBUG';

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

  if (!positioned && items.length > 0) {
    setPositioned(true);
    // 필수 항목 중 미입력 첫 항목을 우선하고, 없으면 선택 항목 중 첫 미입력으로
    const requiredOpen = items.findIndex(
      (item) => item.required && !isItemAnswered(item, answers[item.id], mode),
    );
    const firstOpen =
      requiredOpen !== -1
        ? requiredOpen
        : items.findIndex((item) => !isItemAnswered(item, answers[item.id], mode));
    setIndex(firstOpen === -1 ? items.length - 1 : firstOpen);
  }

  const index = Math.min(rawIndex, Math.max(items.length - 1, 0));

  const current = items[index] ?? null;
  const prev = index > 0 ? items[index - 1] : null;
  const next = index < items.length - 1 ? items[index + 1] : null;
  const answer = current ? answers[current.id] : undefined;

  const percent = items.length === 0 ? 0 : Math.round(((index + 1) / items.length) * 100);
  const complete = isInspectionComplete(items, answers, mode);
  const modeTitle = INSPECTION_MODES.find((entry) => entry.id === mode)?.title ?? '검사';

  const openNgDialog = () => {
    if (!current) return;
    setNgOpen({ itemId: current.id, occurredAt: nowStamp() });
  };

  const finishOrWarn = () => {
    if (complete) onComplete();
    else window.alert('아직 입력하지 않은 항목이 있습니다.');
  };

  /** 현재 항목 처리를 마치고 다음 항목 / 완료로 */
  const proceed = () => {
    if (index < items.length - 1) {
      setIndex(index + 1);
      return;
    }
    finishOrWarn();
  };

  const goNext = () => {
    if (!current) return;

    // NG 이고 처리 방법이 없거나(처음), 재검증을 골랐는데 여전히 NG(값을 못 고침)이면 처리 방법 선택
    const ngAction = answer?.ngAction;
    if ((!ngAction || ngAction === 'RECHECK') && isNgAnswer(current, answer, unitSlotIndex)) {
      openNgDialog();
      return;
    }

    proceed();
  };

  const handleNgConfirm = (action: NgAction) => {
    if (!ngOpen) return;
    const item = items.find((entry) => entry.id === ngOpen.itemId);
    if (!item) return;

    const nextAnswers: InspectionAnswers = {
      ...answers,
      [item.id]: { ...answers[item.id], ngAction: action, ngOccurredAt: ngOpen.occurredAt },
    };
    onChange(nextAnswers);
    setNgOpen(null);

    // 검사 종료 및 부적합 등록: 남은 항목과 무관하게 바로 검사를 종료(완료 확인 화면)
    if (action === 'END') {
      onComplete();
      return;
    }
    if (action === 'RECHECK') {
      // 다음으로 넘어가지 않고 이 항목을 바로 다시 확인한다 (값을 고치면 이력이 초기화됨)
      setRecheckedIds((prevSet) => new Set(prevSet).add(item.id));
      return;
    }
    // CONTINUE
    proceed();
  };

  /** 팝업에서 '재검사': 현재 항목 값을 지우고 다시 입력 */
  const handleNgRecheck = () => {
    if (!ngOpen) return;
    const nextAnswers = { ...answers };
    delete nextAnswers[ngOpen.itemId];
    onChange(nextAnswers);
    setNgOpen(null);
  };

  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  /** 현재 항목의 입력값을 지운다 */
  const clearCurrentAnswer = () => {
    if (!current) return;
    const nextAnswers = { ...answers };
    delete nextAnswers[current.id];
    onChange(nextAnswers);
  };

  /** 하단 '재검사': 지울 입력값이 있으면 사유를 먼저 받는다 */
  const resetCurrent = () => {
    if (!current) return;
    if (summarizeAnswerForLog(current, answer) != null) {
      setRecheckOpen(true);
      return;
    }
    clearCurrentAnswer();
  };

  const submitRecheck = async (reason: string) => {
    if (!current) return;
    setRecheckSaving(true);
    try {
      await onRecheckReason({
        itemId: current.id,
        itemLabel: current.label,
        reason,
        previousSummary: summarizeAnswerForLog(current, answer),
      });
      clearCurrentAnswer();
      setRecheckOpen(false);
    } catch {
      // 저장 실패 안내는 상위에서 처리했다. 사유 창은 열어 둔 채 다시 시도하게 한다.
    } finally {
      setRecheckSaving(false);
    }
  };

  const updateCurrent = (patch: Partial<InspectionAnswer>) => {
    if (!current) return;
    onChange(patchAnswer(answers, current.id, patch));
  };

  /** 정상(OK) 선택 시 '자동 다음 항목'이 켜져 있으면 잠시 후 다음 항목으로 */
  const advanceIfAuto = () => {
    if (!autoNext) return;
    if (index >= items.length - 1) return;
    window.setTimeout(() => {
      setIndex((i) => Math.min(i + 1, items.length - 1));
    }, 180);
  };

  if (isPending) {
    return <CenterMessage text="검사 항목을 불러오는 중..." onBack={onBack} />;
  }

  if (isError) {
    return (
      <CenterMessage
        text={error instanceof Error ? error.message : '검사 항목을 불러오지 못했습니다.'}
        actionLabel="다시 시도"
        onAction={() => void refetch()}
        onBack={onBack}
      />
    );
  }

  if (!current) {
    return <CenterMessage text="검사 항목이 없습니다." onBack={onBack} />;
  }

  const ngItem = ngOpen ? items.find((entry) => entry.id === ngOpen.itemId) ?? null : null;
  const isLastItem = index >= items.length - 1;
  const rechecking = answer?.ngAction === 'RECHECK';
  // 선택 항목을 비워 둔 채 넘어가는 경우 버튼 문구로 알려준다
  const skippingOptional =
    isOptionalItem(current) && !isItemAnswered(current, answer, mode) && !rechecking;
  const nextButtonLabel = rechecking
    ? '재검증 확인'
    : isLastItem
      ? skippingOptional
        ? '비우고 완료'
        : '완료'
      : skippingOptional
        ? '비우고 다음'
        : '다음 항목';

  const range = resolveItemRange(current, unitSlotIndex);
  const rangeHint = formatRangeHint(current, unitSlotIndex);
  const numberDetail =
    current.inputType === 'NUMBER'
      ? judgeNumberDetail(current, answer?.value ?? '', unitSlotIndex)
      : null;
  const effectiveJudgment =
    answer?.judgment ??
    (numberDetail && numberDetail.result !== 'EMPTY' ? numberDetail.result : null);

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
    isJudgmentType && current.array && judgmentSlots.length > 0 && !hasOkNgSlots;
  const showOkNg = isJudgmentType && !showChoiceSlots;

  return (
    <div className="flex h-svh min-h-0 flex-col bg-[#f4f6f8]">
      {/* Header */}
      <header className="shrink-0 bg-white px-4 pb-0 pt-3 md:px-8 md:pt-4">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex size-9 items-center justify-center rounded-lg text-[#1f1f1f] hover:bg-[#f5f6f7] md:size-11"
            aria-label="뒤로"
          >
            <ChevronLeft className="size-5 md:size-6" />
          </button>
          <p className="truncate text-sm font-bold text-[#1f1f1f] md:text-xl">
            {serialNo || '기번 없음'}
          </p>
          <span className="shrink-0 rounded-md bg-[#eceff3] px-1.5 py-0.5 text-[10px] font-semibold text-[#5f6368] md:px-2.5 md:py-1 md:text-sm">
            {modeTitle}
          </span>
          <div className="min-w-0 flex-1" />
          <p className="shrink-0 text-xs font-semibold text-[#5f6368] md:text-base">
            {index + 1} / {items.length} · {percent}%
          </p>
          <span
            className={cn(
              'shrink-0 text-[11px] font-semibold md:text-sm',
              SAVE_STATUS_LABEL[saveStatus].className,
            )}
            aria-live="polite"
          >
            {SAVE_STATUS_LABEL[saveStatus].text}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-[#d8dce3] px-2.5 py-1.5 text-xs font-semibold text-[#1f1f1f] md:h-11 md:rounded-xl md:px-5 md:text-base"
            onClick={() => onHold?.()}
          >
            보류
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8eaed] md:mt-4 md:h-2">
          <div
            className="h-full rounded-full bg-[#3c3c3c] transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </header>
      <div className="h-3 shrink-0 border-b border-[#e8eaed] bg-white md:h-4" />

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-8 md:py-5">
        <div className="mx-auto w-full max-w-[860px] space-y-3 md:space-y-5">
          {rechecking && (
            <p className="rounded-xl bg-[#fffbeb] px-4 py-3 text-sm font-semibold text-[#b45309] md:text-base">
              NG 재검증 중 · 값을 다시 확인해 수정한 뒤 하단 버튼을 누르세요.
            </p>
          )}
          {/* Prev / Next cards */}
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            <button
              type="button"
              disabled={!prev}
              onClick={goPrev}
              className="rounded-xl bg-white px-3 py-2.5 text-left shadow-sm disabled:opacity-40 md:rounded-2xl md:px-5 md:py-4"
            >
              <p className="truncate text-[11px] font-semibold text-[#8b8f96] md:text-sm">
                ◀ 이전 · {prev ? `${index}/${items.length}` : '-'}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-bold text-[#1f1f1f] md:text-lg">
                  {prev?.label ?? '없음'}
                </p>
                {prev && answers[prev.id]?.judgment && (
                  <span
                    className={cn(
                      'shrink-0 text-xs font-bold md:text-base',
                      answers[prev.id]?.judgment === 'OK' ? 'text-[#166534]' : 'text-[#b91c1c]',
                    )}
                  >
                    {answers[prev.id]?.judgment}
                  </span>
                )}
              </div>
            </button>
            <button
              type="button"
              disabled={!next}
              onClick={goNext}
              className="rounded-xl border border-[#d8dce3] bg-white px-3 py-2.5 text-left disabled:opacity-40 md:rounded-2xl md:px-5 md:py-4"
            >
              <p className="truncate text-[11px] font-semibold text-[#8b8f96] md:text-sm">
                다음 ▶ · {next ? `${index + 2}/${items.length}` : '-'}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-bold text-[#1f1f1f] md:text-lg">
                  {next?.label ?? '없음'}
                </p>
                {next && formatRangeHint(next, unitSlotIndex) && (
                  <span className="shrink-0 truncate text-[11px] text-[#8b8f96] md:text-sm">
                    {formatRangeHint(next, unitSlotIndex)}
                  </span>
                )}
              </div>
            </button>
          </div>

          <section>
            <p className="text-xs font-semibold text-[#8b8f96] md:text-base">
              {current.itemNo != null ? `${current.itemNo}` : `${index + 1}`}
              {datasheetLabel ? ` · ${datasheetLabel}` : ''}
              {' · '}
              {index + 1} / {items.length}
              {unitLabel ? ` · ${unitLabel}` : ''}
              {isOptionalItem(current) && (
                <span className="ml-2 rounded bg-[#f1f3f5] px-1.5 py-0.5 text-[11px] font-bold text-[#5f6368] md:text-sm">
                  선택 입력
                </span>
              )}
            </p>
            <h2 className="mt-1 text-xl font-bold leading-snug text-[#1f1f1f] md:mt-2 md:text-3xl md:leading-snug">
              {current.label}
              {rangeHint ? ` — ${rangeHint}` : ''}
            </h2>
            {current.groupName ? (
              <p className="mt-1 text-sm text-[#8b8f96] md:mt-2 md:text-lg">{current.groupName}</p>
            ) : null}
          </section>

          {(current.specDescription?.trim() || current.inputType === 'NUMBER') && (
            <div className="space-y-2 rounded-2xl bg-white px-3 py-3 md:space-y-4 md:px-6 md:py-5">
              {current.specDescription?.trim() ? (
                <div>
                  <p className="text-[11px] font-semibold text-[#8b8f96] md:text-sm">규격설명</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#1f1f1f] md:mt-2 md:text-lg md:leading-relaxed">
                    {current.specDescription.trim()}
                  </p>
                </div>
              ) : null}
              {current.inputType === 'NUMBER' && (
                <div
                  className={cn(
                    'grid grid-cols-3 divide-x divide-[#f0f2f4]',
                    current.specDescription?.trim() && 'border-t border-[#f0f2f4] pt-3 md:pt-4',
                  )}
                >
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
              )}
            </div>
          )}

          <div className="space-y-3 md:space-y-5">
            {current.inputType === 'NUMBER' && (
              <>
                <section className="space-y-2">
                  <p className="text-sm font-bold text-[#1f1f1f] md:text-lg">측정값</p>
                  <label className="flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border-2 border-[#1f1f1f] bg-white px-4 py-3 md:min-h-[104px] md:px-6 md:py-4">
                    <span className="shrink-0 text-sm text-[#9aa0a6] md:text-lg">
                      {answer?.value ? '측정값' : '탭하여 키패드 열기'}
                    </span>
                    <input
                      value={answer?.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const judged = judgeNumberDetail(current, value, unitSlotIndex);
                        updateCurrent({
                          value,
                          judgment: judged.result === 'EMPTY' ? null : judged.result,
                        });
                      }}
                      inputMode="decimal"
                      className="w-full max-w-[60%] bg-transparent text-right text-3xl font-bold text-[#1f1f1f] outline-none md:text-5xl"
                      placeholder="0"
                    />
                  </label>

                  {numberDetail &&
                    numberDetail.result !== 'EMPTY' &&
                    numberDetail.value != null && (
                      <div
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold md:px-5 md:py-4 md:text-lg',
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
                        <span className="shrink-0 font-bold">{numberDetail.result}</span>
                      </div>
                    )}
                </section>
              </>
            )}

            {showChoiceSlots && (
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                {judgmentSlots.map((slot) => {
                  const multiCheck = current.inputType === 'CHECK';
                  const active = multiCheck
                    ? Boolean(answer?.slotValues?.[slot.slotIndex]?.trim())
                    : answer?.slotIndex === slot.slotIndex;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        if (multiCheck) {
                          const nextValues = { ...answer?.slotValues };
                          if (nextValues[slot.slotIndex]?.trim()) {
                            delete nextValues[slot.slotIndex];
                          } else {
                            nextValues[slot.slotIndex] = slot.label || 'Y';
                          }
                          const anyChecked = Object.values(nextValues).some((v) =>
                            Boolean(v?.trim()),
                          );
                          updateCurrent({
                            slotValues: nextValues,
                            slotIndex: null,
                            judgment: anyChecked ? 'OK' : null,
                          });
                          return;
                        }
                        const isNg =
                          slot.label.toUpperCase().includes('NG') || slot.label.includes('불');
                        updateCurrent({
                          slotIndex: slot.slotIndex,
                          judgment: isNg ? 'NG' : 'OK',
                        });
                        if (!isNg) advanceIfAuto();
                      }}
                      className={cn(
                        'h-14 rounded-2xl px-3 text-lg font-bold transition-colors md:h-20 md:text-2xl',
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
                      className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-[#e8eaed] bg-white px-4 md:min-h-[80px] md:gap-4 md:px-6"
                    >
                      <span className="w-16 shrink-0 text-sm font-semibold text-[#8b8f96] md:w-24 md:text-lg">
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
                        className="w-full bg-transparent text-base font-semibold text-[#1f1f1f] outline-none md:text-2xl"
                        placeholder="입력"
                      />
                    </label>
                  ))}
                </div>
              )}

            {(current.inputType === 'TEXT' || current.inputType === 'MIXED') && !current.array && (
              <label className="flex min-h-[72px] items-center rounded-2xl border border-[#e8eaed] bg-white px-4 md:min-h-[104px] md:px-6">
                <input
                  value={answer?.value ?? ''}
                  onChange={(e) => updateCurrent({ value: e.target.value })}
                  className="w-full bg-transparent text-lg font-semibold text-[#1f1f1f] outline-none md:text-3xl"
                  placeholder="입력"
                />
              </label>
            )}

            {showOkNg && (
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    updateCurrent(judgmentPatch(current, 'OK', answer));
                    advanceIfAuto();
                  }}
                  className={cn(
                    'h-14 rounded-2xl border-2 text-lg font-bold transition-colors md:h-[72px] md:text-3xl',
                    effectiveJudgment === 'OK'
                      ? 'border-[#166534] bg-[#ecfdf3] text-[#166534]'
                      : 'border-[#d8dce3] bg-white text-[#166534]',
                  )}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateCurrent(judgmentPatch(current, 'NG', answer));
                    openNgDialog();
                  }}
                  className={cn(
                    'h-14 rounded-2xl border-2 text-lg font-bold transition-colors md:h-[72px] md:text-3xl',
                    effectiveJudgment === 'NG'
                      ? 'border-[#b91c1c] bg-[#fef2f2] text-[#b91c1c]'
                      : 'border-[#d8dce3] bg-white text-[#b91c1c]',
                  )}
                >
                  NG
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="shrink-0 border-t border-[#e8eaed] bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-8 md:py-4">
        {/* 부품출하 모드: 스킵 가능 항목만 사용자가 의도적으로 SKIP 표시 (하단에 항상 노출) */}
        {mode === 'PARTS_SHIPPING' && (
          <div className="mx-auto mb-2 w-full max-w-[860px] md:mb-3">
            {!current.skippable ? (
              <p className="rounded-xl bg-[#fafbfc] px-4 py-2.5 text-center text-xs text-[#8b8f96] md:text-sm">
                스킵 불가 항목입니다 · 스킵하려면 데이터시트 설정에서 &lsquo;스킵 가능&rsquo;을 켜세요
              </p>
            ) : answer?.skipped ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f6f7] px-4 py-2.5 md:rounded-2xl md:px-6 md:py-4">
                <p className="text-sm font-semibold text-[#5f6368] md:text-lg">
                  SKIP 으로 표시된 항목입니다
                </p>
                <button
                  type="button"
                  onClick={() => {
                    // 해당 항목 답변을 지워 다시 입력 가능하게 한다
                    const next = { ...answers };
                    delete next[current.id];
                    onChange(next);
                  }}
                  className="h-9 shrink-0 rounded-lg border border-[#d8dce3] bg-white px-3 text-sm font-semibold text-[#1f1f1f] md:h-11 md:text-base"
                >
                  SKIP 해제
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...answers,
                    [current.id]: { skipped: true },
                  });
                }}
                className="h-12 w-full rounded-xl bg-[#f5f6f7] text-sm font-bold text-[#5f6368] md:h-16 md:rounded-2xl md:text-lg"
              >
                이 항목 SKIP
              </button>
            )}
          </div>
        )}
        <div className="mx-auto grid w-full max-w-[860px] grid-cols-4 gap-2 md:grid-cols-[1fr_1.2fr_1fr_1.6fr] md:gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={!prev}
            className="h-12 rounded-xl border border-[#d8dce3] bg-white text-sm font-semibold text-[#1f1f1f] disabled:opacity-40 md:h-16 md:text-lg"
          >
            이전
          </button>
          <button
            type="button"
            onClick={() => setJumpOpen(true)}
            className="h-12 rounded-xl border border-[#d8dce3] bg-white text-sm font-semibold text-[#1f1f1f] md:h-16 md:text-lg"
          >
            항목 이동
          </button>
          <button
            type="button"
            onClick={resetCurrent}
            className="h-12 rounded-xl border border-[#d8dce3] bg-white text-sm font-semibold text-[#1f1f1f] md:h-16 md:text-lg"
          >
            재검사
          </button>
          <button
            type="button"
            onClick={goNext}
            className="h-12 rounded-xl bg-[#3c3c3c] text-sm font-bold text-white md:h-16 md:text-xl"
          >
            {nextButtonLabel}
          </button>
        </div>
      </div>

      {jumpOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="max-h-[70svh] w-full overflow-hidden rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl md:max-h-[80svh] md:max-w-3xl">
            <div className="flex items-center justify-between border-b border-[#eceef1] px-4 py-3 md:px-6 md:py-4">
              <p className="font-bold text-[#1f1f1f] md:text-xl">항목 이동</p>
              <button
                type="button"
                onClick={() => setJumpOpen(false)}
                className="text-sm font-semibold text-[#5f6368] md:h-11 md:px-4 md:text-lg"
              >
                닫기
              </button>
            </div>
            <ul className="max-h-[55svh] overflow-y-auto p-2 md:grid md:max-h-[66svh] md:grid-cols-2 md:gap-1 md:p-3">
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
                        'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left md:min-h-14 md:px-4',
                        i === index ? 'bg-[#f5f6f7]' : 'hover:bg-[#fafafa]',
                      )}
                    >
                      <span className="w-6 text-sm font-bold text-[#8b8f96] md:w-8 md:text-base">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1f1f1f] md:text-lg">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          'text-xs font-bold md:text-base',
                          done ? 'text-[#166534]' : 'text-[#9aa0a6]',
                        )}
                      >
                        {done ? '완료' : isOptionalItem(item) ? '선택 · 미입력' : '미입력'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <RecheckReasonDialog
        open={recheckOpen}
        itemLabel={current.label}
        saving={recheckSaving}
        onCancel={() => setRecheckOpen(false)}
        onSubmit={(reason) => void submitRecheck(reason)}
      />

      {ngOpen && ngItem && (
        <NgOccurredDialog
          key={`${ngOpen.itemId}-${ngOpen.occurredAt}`}
          info={buildNgEventInfo(ngItem, answers[ngItem.id], unitSlotIndex)}
          occurredAt={ngOpen.occurredAt.replace('T', ' ')}
          disabledActions={recheckedIds.has(ngItem.id) ? ['RECHECK'] : []}
          onRecheck={handleNgRecheck}
          onConfirm={handleNgConfirm}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 md:px-5 md:first:pl-0">
      <p className="text-[11px] font-semibold text-[#8b8f96] md:text-sm">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-[#1f1f1f] md:text-2xl">{value}</p>
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
          <button type="button" onClick={onAction} className="text-sm font-semibold underline">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
