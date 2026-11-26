'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

import {
  normalizeDatasheetItems,
  useDatasheetDetail,
  type DatasheetSummary,
} from '@/features/settings';
import { cn } from '@/shared/lib/utils';

import type { BasicInfoFormValues } from '../lib/basic-info-fields';
import type { InspectionAnswers } from '../lib/inspection-answers';
import {
  buildInspectionOverlays,
  buildInspectionResultRows,
  resolveUnitSlotIndex,
  summarizeResults,
} from '../lib/build-inspection-overlays';
import type { InspectionOverlay } from '../lib/build-inspection-overlays';
import { buildResultFileName } from '../lib/result-file-name';
import type { InspectionModeId } from '../model/inspection-modes';
import { InspectionFilledPdfViewer } from './inspection-filled-pdf-viewer';

type InspectionCompleteConfirmProps = {
  datasheet: DatasheetSummary;
  basic: BasicInfoFormValues;
  mode: InspectionModeId;
  answers: InspectionAnswers;
  onBack: () => void;
  onConfirm: (result: InspectionConfirmResult) => void;
  /** 저장 요청 진행 중 */
  confirming?: boolean;
  /** 저장 진행 중 버튼에 보여줄 문구 */
  confirmingLabel?: string;
};

/** 완료 확정 시 상위로 넘기는 결과 (오버레이는 결과 PDF 생성에 사용) */
export type InspectionConfirmResult = {
  overlays: InspectionOverlay[];
  ok: number;
  ng: number;
  skip: number;
};

export function InspectionCompleteConfirm({
  datasheet,
  basic,
  mode,
  answers,
  onBack,
  onConfirm,
  confirming = false,
  confirmingLabel = '저장 중...',
}: InspectionCompleteConfirmProps) {
  const { data, isPending, isError, error, refetch } = useDatasheetDetail(datasheet.id);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [pageCount, setPageCount] = useState(1);

  const items = useMemo(() => normalizeDatasheetItems(data?.items ?? []), [data]);

  const unitSlotIndex = useMemo(() => resolveUnitSlotIndex(items, basic.unit), [items, basic.unit]);

  const overlays = useMemo(() => {
    if (!data) return [];
    return buildInspectionOverlays({
      items,
      answers,
      basic,
      detail: data,
    });
  }, [data, items, answers, basic]);

  const rows = useMemo(
    () =>
      buildInspectionResultRows({
        items,
        answers,
        unitSlotIndex,
        mode,
      }),
    [items, answers, unitSlotIndex, mode],
  );

  const summary = useMemo(() => summarizeResults(rows), [rows]);
  const statusOk = summary.ng === 0;
  const highlighted = rows.filter((row) => row.highlightNg);
  const numberRows = rows.filter((row) => row.measured != null && row.judgment !== 'SKIP');
  const previewRows = showAll
    ? rows
    : [...highlighted, ...numberRows.filter((r) => !r.highlightNg)].slice(
        0,
        showAll ? rows.length : Math.max(3, highlighted.length + 2),
      );
  const judgmentOnlyOk = rows.filter(
    (row) =>
      row.judgment === 'OK' &&
      !highlighted.some((h) => h.itemId === row.itemId) &&
      !previewRows.some((p) => p.itemId === row.itemId),
  ).length;

  if (isPending) {
    return <Center text="결과 준비 중..." onBack={onBack} />;
  }

  if (isError || !data) {
    return (
      <Center
        text={error instanceof Error ? error.message : '결과를 불러오지 못했습니다.'}
        onBack={onBack}
        actionLabel="다시 시도"
        onAction={() => void refetch()}
      />
    );
  }

  const fileHint = `저장 파일: ${buildResultFileName(basic)} · 파일 보관함에서 확인할 수 있습니다.`;

  return (
    <div className="flex h-svh min-h-0 flex-col bg-[#f4f6f8]">
      <header className="shrink-0 border-b border-[#e8eaed] bg-white px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex size-9 items-center justify-center rounded-lg hover:bg-[#f5f6f7]"
            aria-label="뒤로"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex-1 text-lg font-bold text-[#1f1f1f]">검사 완료 확인</h1>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-bold',
              statusOk ? 'bg-[#ecfdf3] text-[#166534]' : 'bg-[#fef2f2] text-[#b91c1c]',
            )}
          >
            {statusOk ? '정상 완료' : 'NG 포함'}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section className="grid grid-cols-3 gap-2">
          <Stat label="OK" value={summary.ok} tone="ok" />
          <Stat label="NG" value={summary.ng} tone="ng" />
          <Stat label="SKIP" value={summary.skip} tone="neutral" />
        </section>

        <section className="rounded-2xl bg-white px-4 py-3 text-sm text-[#5f6368]">
          <p className="font-semibold text-[#1f1f1f]">{datasheet.fileName}</p>
          <p className="mt-1">
            검사자 {basic.inspector || '-'} · {basic.inspectDate || '-'}
          </p>
          {basic.inspectorChangeReason.trim() && (
            <p className="mt-1 break-words">검사자 변경 사유: {basic.inspectorChangeReason}</p>
          )}
          <p className="mt-1">
            전체 {summary.total} / 완료 {summary.done}
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b border-[#f0f2f4] px-4 py-3">
            <h2 className="text-sm font-bold text-[#1f1f1f]">측정 결과</h2>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-semibold text-[#5f6368] underline-offset-2 hover:underline"
            >
              {showAll ? '요약 보기' : '전체 항목 보기'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-[#fafbfc] text-[11px] text-[#8b8f96]">
                <tr>
                  <th className="px-3 py-2 font-semibold">항목</th>
                  <th className="px-3 py-2 font-semibold">규격</th>
                  <th className="px-3 py-2 font-semibold">측정값</th>
                  <th className="px-3 py-2 font-semibold">최종값</th>
                  <th className="px-3 py-2 font-semibold">판정</th>
                </tr>
              </thead>
              <tbody>
                {(showAll ? rows : previewRows).map((row) => (
                  <tr
                    key={row.itemId}
                    className={cn('border-t border-[#f0f2f4]', row.highlightNg && 'bg-[#fef2f2]')}
                  >
                    <td className="px-3 py-2.5 font-semibold text-[#1f1f1f]">{row.label}</td>
                    <td className="max-w-[12rem] px-3 py-2.5 text-[#5f6368]">
                      {row.standard ? (
                        <span className="whitespace-pre-wrap break-words">
                          {row.standard}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[#1f1f1f]">{row.measured ?? '-'}</td>
                    <td
                      className={cn(
                        'px-3 py-2.5 font-semibold',
                        row.highlightNg ? 'text-[#b91c1c]' : 'text-[#1f1f1f]',
                      )}
                    >
                      {row.finalValue ?? '-'}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2.5 font-bold',
                        row.judgment === 'OK' && 'text-[#166534]',
                        row.judgment === 'NG' && 'text-[#b91c1c]',
                        row.judgment === 'SKIP' && 'text-[#5f6368]',
                      )}
                    >
                      {row.judgment ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!showAll && judgmentOnlyOk > 0 && (
            <p className="border-t border-[#f0f2f4] px-4 py-3 text-sm text-[#5f6368]">
              OK/NG 판정 항목 {judgmentOnlyOk}건 ·{' '}
              <span className="font-bold text-[#166534]">모두 OK</span>
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-white px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#1f1f1f]">PDF 미리보기</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#8b8f96]">
                입력값을 좌표에 반영한 미리보기입니다. 동그라미·체크·측정값이 파란색으로 표시됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="shrink-0 rounded-lg border border-[#d8dce3] px-3 py-1.5 text-xs font-semibold text-[#1f1f1f]"
            >
              크게 보기
            </button>
          </div>

          <div className={cn('mt-3 grid gap-3', pageCount > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {Array.from({ length: Math.max(Math.min(pageCount, 2), 1) }, (_, index) => (
              <div
                key={index}
                role="button"
                tabIndex={0}
                onClick={() => setPreviewOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setPreviewOpen(true);
                  }
                }}
                className="cursor-pointer overflow-hidden rounded-xl border border-[#e8eaed] text-left"
              >
                <div className="pointer-events-none">
                  <InspectionFilledPdfViewer
                    datasheetId={datasheet.id}
                    overlays={overlays}
                    fixedPage={index + 1}
                    compact
                    onReadyPages={index === 0 ? setPageCount : undefined}
                  />
                </div>
                <p className="truncate bg-[#fafbfc] px-2 py-1.5 text-[11px] font-semibold text-[#5f6368]">
                  {basic.serialNo || datasheet.name} · {index + 1}/{Math.max(pageCount, 1)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <p className="break-all px-1 text-[11px] text-[#9aa0a6]">{fileHint}</p>
      </div>

      <div className="shrink-0 border-t border-[#e8eaed] bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-[1fr_1.4fr] gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={confirming}
            className="h-12 rounded-xl border border-[#d8dce3] bg-white text-sm font-semibold text-[#1f1f1f] disabled:opacity-40"
          >
            항목 검토
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm({
                overlays,
                ok: summary.ok,
                ng: summary.ng,
                skip: summary.skip,
              })
            }
            disabled={confirming}
            className="h-12 rounded-xl bg-[#3c3c3c] text-sm font-bold text-white disabled:opacity-60"
          >
            {confirming ? confirmingLabel : '완료 확정 및 저장'}
          </button>
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-[#e8eaed] px-4 py-3">
            <p className="font-bold text-[#1f1f1f]">PDF 미리보기</p>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="rounded-lg bg-[#3c3c3c] px-4 py-2 text-sm font-bold text-white"
            >
              닫기
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <InspectionFilledPdfViewer
              key={`preview-${datasheet.id}`}
              datasheetId={datasheet.id}
              overlays={overlays}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ok' | 'ng' | 'neutral';
}) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-center">
      <p className="text-xs font-semibold text-[#8b8f96]">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold',
          tone === 'ok' && 'text-[#166534]',
          tone === 'ng' && 'text-[#b91c1c]',
          tone === 'neutral' && 'text-[#1f1f1f]',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Center({
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
        <button type="button" onClick={onBack} className="rounded-lg p-2">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="font-bold">검사 완료 확인</h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
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
