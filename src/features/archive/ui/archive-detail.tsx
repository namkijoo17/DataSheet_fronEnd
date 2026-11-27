'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Download, ExternalLink } from 'lucide-react';

import {
  buildInspectionResultRows,
  buildNgEventInfo,
  fetchInspectionDetail,
  fromAnswersResponse,
  fromBasicPayload,
  INSPECTION_MODES,
  isInspectionItem,
  NG_ACTION_OPTIONS,
  PART_NUMBER_SLOTS,
  resolveUnitSlotIndex,
  summarizeResults,
  type InspectionDetailResponse,
} from '@/features/inspection/create-inspection';
import {
  normalizeDatasheetItems,
  useDatasheetDetail,
  type DatasheetItem,
} from '@/features/settings';
import { cn } from '@/shared/lib/utils';

import {
  downloadResultFile,
  formatDateTime,
  openResultFile,
} from '../lib/result-file';

type NgHistoryEntry = {
  itemId: number;
  actionTitle: string;
  occurredAt: string | null;
  info: ReturnType<typeof buildNgEventInfo>;
};

/** 저장된 검사 응답 + 데이터시트 항목으로 상세 화면용 데이터를 만든다 */
function buildArchiveView(detail: InspectionDetailResponse, items: DatasheetItem[]) {
  const basic = fromBasicPayload(detail.basic);
  const answers = fromAnswersResponse(detail.answers);
  const unitSlotIndex = resolveUnitSlotIndex(items, basic.unit);
  const rows = buildInspectionResultRows({
    items,
    answers,
    unitSlotIndex,
    mode: detail.mode,
  });
  const summary = summarizeResults(rows);

  const inspectionItems = items.filter(isInspectionItem);
  const ngHistory: NgHistoryEntry[] = inspectionItems
    .flatMap((item) => {
      const answer = answers[item.id];
      if (!answer?.ngAction) return [];
      return [
        {
          itemId: item.id,
          actionTitle:
            NG_ACTION_OPTIONS.find((option) => option.id === answer.ngAction)?.title ??
            answer.ngAction,
          occurredAt: answer.ngOccurredAt ?? null,
          info: buildNgEventInfo(item, answer, unitSlotIndex),
        },
      ];
    })
    .sort((a, b) => (a.occurredAt ?? '').localeCompare(b.occurredAt ?? ''));

  const recordedIds = new Set(ngHistory.map((entry) => entry.itemId));
  const unrecordedNgCount = rows.filter(
    (row) => row.judgment === 'NG' && !recordedIds.has(row.itemId),
  ).length;

  return { basic, rows, summary, ngHistory, unrecordedNgCount };
}

export function ArchiveDetail({ inspectionId }: { inspectionId: number }) {
  const [busy, setBusy] = useState<'open' | 'download' | null>(null);

  const detailQuery = useQuery({
    queryKey: ['inspections', 'detail', inspectionId],
    queryFn: () => fetchInspectionDetail(inspectionId),
    staleTime: 0,
  });
  const detail = detailQuery.data;
  const datasheetQuery = useDatasheetDetail(detail?.datasheetId ?? 0);
  const datasheet = datasheetQuery.data;

  const items = useMemo(
    () => normalizeDatasheetItems(datasheet?.items ?? []),
    [datasheet],
  );

  const view = useMemo(
    () => (detail && datasheet ? buildArchiveView(detail, items) : null),
    [detail, datasheet, items],
  );

  if (detailQuery.isError || datasheetQuery.isError) {
    const err = detailQuery.error ?? datasheetQuery.error;
    return (
      <Notice
        text={err instanceof Error ? err.message : '검사 내역을 불러오지 못했습니다.'}
        actionLabel="다시 시도"
        onAction={() => {
          void detailQuery.refetch();
          void datasheetQuery.refetch();
        }}
      />
    );
  }

  if (!detail || !datasheet || !view) {
    return <Notice text="검사 내역을 불러오는 중..." />;
  }

  const { basic, rows, summary, ngHistory, unrecordedNgCount } = view;
  const fileName = detail.fileName ?? `inspection_${detail.id}.pdf`;
  const isNg = summary.ng > 0;
  const modeTitle = INSPECTION_MODES.find((mode) => mode.id === detail.mode)?.title ?? detail.mode;
  const filledParts = PART_NUMBER_SLOTS.filter((slot) => basic.parts[slot]?.trim());

  const runFile = async (kind: 'open' | 'download') => {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === 'open') await openResultFile(detail.id, fileName);
      else await downloadResultFile(detail.id, fileName);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '파일을 처리하지 못했습니다.');
    } finally {
      setBusy(null);
    }
  };

  const infoRows: [string, string | null | undefined][] = [
    ['데이터시트', datasheet.name],
    ['검사 모드', modeTitle],
    ['기번', basic.serialNo],
    ['유닛', basic.unit],
    ['라인', basic.line],
    ['검사일', basic.inspectDate],
    ['검사자', basic.inspector],
    ['온도', basic.temperature],
    ['습도', basic.humidity],
  ];

  return (
    <section className="w-full space-y-4 pb-10">
      <Link
        href="/archive"
        className="inline-flex items-center gap-1 text-sm font-semibold text-[#5f6368] hover:text-[#1f1f1f]"
      >
        <ChevronLeft className="size-4" />
        파일 보관함
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-all text-xl font-bold text-[#1f1f1f]">{fileName}</h1>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-bold',
                isNg ? 'bg-[#fef2f2] text-[#b91c1c]' : 'bg-[#ecfdf3] text-[#166534]',
              )}
            >
              {isNg ? `NG ${summary.ng}` : '정상'}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#8b8f96]">{datasheet.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={busy != null}
            onClick={() => void runFile('open')}
            className="flex h-9 items-center gap-1 rounded-lg border border-[#d8dce3] bg-white px-3 text-xs font-semibold text-[#1f1f1f] disabled:opacity-50"
          >
            <ExternalLink className="size-3.5" />
            열기
          </button>
          <button
            type="button"
            disabled={busy != null}
            onClick={() => void runFile('download')}
            className="flex h-9 items-center gap-1 rounded-lg bg-[#3c3c3c] px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Download className="size-3.5" />
            저장
          </button>
        </div>
      </div>

      <Card title="기본 정보">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          {infoRows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs font-semibold text-[#8b8f96]">{label}</dt>
              <dd className="mt-0.5 break-words font-semibold text-[#1f1f1f]">{value?.trim() || '-'}</dd>
            </div>
          ))}
        </dl>
        {basic.inspectorChangeReason.trim() && (
          <p className="mt-4 rounded-xl bg-[#f7f8fa] px-3 py-2.5 text-sm text-[#5f6368]">
            <span className="font-semibold text-[#1f1f1f]">검사자 변경 사유 · </span>
            {basic.inspectorChangeReason}
          </p>
        )}
        {filledParts.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#8b8f96]">부품 번호</p>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              {filledParts.map((slot) => (
                <li key={slot} className="min-w-0 break-all">
                  <span className="text-[#8b8f96]">{slot} </span>
                  <span className="font-semibold text-[#1f1f1f]">{basic.parts[slot]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="판정 요약">
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="전체" value={summary.total} />
          <Stat label="OK" value={summary.ok} tone="ok" />
          <Stat label="NG" value={summary.ng} tone="ng" />
          <Stat label="SKIP" value={summary.skip} />
        </div>
      </Card>

      <Card title={`NG 처리 이력 (${ngHistory.length}건)`}>
        {ngHistory.length === 0 && unrecordedNgCount === 0 && (
          <p className="text-sm text-[#8b8f96]">NG 처리 이력이 없습니다.</p>
        )}
        {ngHistory.length > 0 && (
          <ul className="space-y-2.5">
            {ngHistory.map((entry) => (
              <li
                key={entry.itemId}
                className="rounded-xl border border-[#fde2e2] bg-[#fef2f2]/50 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-[#1f1f1f]">{entry.info.itemLabel}</p>
                  <span className="text-xs font-semibold text-[#b91c1c]">{entry.info.title}</span>
                </div>
                <p className="mt-1 text-xs text-[#5f6368]">
                  측정 {entry.info.measured} · 규격 {entry.info.spec}
                  {entry.info.deviation ? ` · ${entry.info.deviation}` : ''}
                </p>
                <p className="mt-1 text-xs text-[#1f1f1f]">
                  처리 <span className="font-bold">{entry.actionTitle}</span>
                  <span className="text-[#8b8f96]"> · 발생 {formatDateTime(entry.occurredAt)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
        {unrecordedNgCount > 0 && (
          <p className="mt-3 text-xs text-[#8b8f96]">
            처리 방법이 기록되지 않은 NG 항목 {unrecordedNgCount}건
          </p>
        )}
      </Card>

      <Card title="진행 이력">
        <ol className="space-y-2 text-sm">
          <TimelineRow label="검사 시작" value={detail.createdAt} />
          {(detail.rechecks ?? []).map((recheck, index) => (
            <li
              key={`${recheck.itemId}-${recheck.createdAt}-${index}`}
              className="rounded-xl bg-[#fff8eb] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-semibold text-[#1f1f1f]">
                  재검사 · {recheck.itemLabel?.trim() || `항목 ${recheck.itemId}`}
                </span>
                <span className="shrink-0 text-xs font-semibold text-[#5f6368]">
                  {formatDateTime(recheck.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#1f1f1f]">
                사유 <span className="font-bold">{recheck.reason}</span>
              </p>
              {recheck.previousSummary && (
                <p className="mt-0.5 text-xs text-[#8b8f96]">이전 입력 · {recheck.previousSummary}</p>
              )}
            </li>
          ))}
          <TimelineRow label="마지막 저장" value={detail.updatedAt} />
          <TimelineRow label="검사 완료" value={detail.completedAt} />
        </ol>
      </Card>

      <Card title="측정 결과">
        <div className="-mx-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-[#fafbfc] text-[11px] text-[#8b8f96]">
              <tr>
                <th className="px-4 py-2 font-semibold">항목</th>
                <th className="px-3 py-2 font-semibold">규격</th>
                <th className="px-3 py-2 font-semibold">측정값</th>
                <th className="px-3 py-2 font-semibold">최종값</th>
                <th className="px-3 py-2 font-semibold">판정</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.itemId}
                  className={cn('border-t border-[#f0f2f4]', row.highlightNg && 'bg-[#fef2f2]')}
                >
                  <td className="px-4 py-2.5 font-semibold text-[#1f1f1f]">{row.label}</td>
                  <td className="max-w-[12rem] px-3 py-2.5 text-[#5f6368]">
                    <span className="whitespace-pre-wrap break-words">{row.standard ?? '-'}</span>
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
      </Card>
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white px-4 py-4">
      <h2 className="mb-3 text-sm font-bold text-[#1f1f1f]">{title}</h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'ok' | 'ng';
}) {
  return (
    <div className="rounded-xl bg-[#f7f8fa] px-2 py-2.5">
      <p className="text-xs font-semibold text-[#8b8f96]">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xl font-bold',
          tone === 'ok' && 'text-[#166534]',
          tone === 'ng' && 'text-[#b91c1c]',
          !tone && 'text-[#1f1f1f]',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string | null }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-[#5f6368]">{label}</span>
      <span className="font-semibold text-[#1f1f1f]">{formatDateTime(value)}</span>
    </li>
  );
}

function Notice({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white px-4 py-16 text-center">
      <p className="text-sm text-[#8b8f96]">{text}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="text-sm font-semibold underline">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
