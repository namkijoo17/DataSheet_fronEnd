'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, Check } from 'lucide-react';

import {
  normalizeDatasheetItems,
  useDatasheetDetail,
  type DatasheetItem,
} from '@/features/settings';
import { cn } from '@/shared/lib/utils';

import type { InspectionAnswers } from '../lib/inspection-answers';
import { isInspectionItem } from '../lib/inspection-sequence';

type DebugItemSelectProps = {
  datasheetId: number;
  datasheetLabel: string;
  /** 현재 답변. 비어 있으면 처음 고르는 것, 있으면 기존 선택 상태를 펼쳐 준다 */
  answers: InspectionAnswers;
  onBack: () => void;
  /** 선택한 항목 ID 와 전체 검사 항목 ID */
  onConfirm: (selectedIds: number[], allItemIds: number[]) => void;
};

function listInspectionItems(items: DatasheetItem[]) {
  return items.filter(isInspectionItem).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.itemNo - b.itemNo;
  });
}

export function DebugItemSelect({
  datasheetId,
  datasheetLabel,
  answers,
  onBack,
  onConfirm,
}: DebugItemSelectProps) {
  const { data, isPending, isError, error, refetch } = useDatasheetDetail(datasheetId);
  const items = useMemo(
    () => listInspectionItems(normalizeDatasheetItems(data?.items ?? [])),
    [data],
  );

  // 처음 열 때의 기본 선택: 답변이 없으면 빈 선택, 있으면 SKIP 이 아닌 항목
  const initialSelected = useMemo(() => {
    const ids = new Set<number>();
    if (Object.keys(answers).length === 0) return ids;
    for (const item of items) {
      if (!answers[item.id]?.skipped) ids.add(item.id);
    }
    return ids;
  }, [items, answers]);

  const [override, setOverride] = useState<Set<number> | null>(null);
  const selected = override ?? initialSelected;

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOverride(next);
  };

  const selectedCount = items.filter((item) => selected.has(item.id)).length;

  return (
    <div className="flex h-svh min-h-0 flex-col bg-[#f4f6f8]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[#e8eaed] bg-white px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-lg text-[#1f1f1f] hover:bg-[#f5f6f7]"
          aria-label="뒤로"
        >
          <ChevronLeft className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-[#1f1f1f]">검사 항목 선택</h1>
          <p className="truncate text-xs text-[#8b8f96]">{datasheetLabel}</p>
        </div>
      </header>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e8eaed] bg-white px-4 py-2.5">
        <p className="text-sm font-semibold text-[#1f1f1f]">
          {selectedCount} / {items.length} 선택
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setOverride(new Set(items.map((item) => item.id)))}
            disabled={items.length === 0}
            className="rounded-lg border border-[#d8dce3] px-3 py-1.5 text-xs font-semibold text-[#1f1f1f] disabled:opacity-40"
          >
            전체 선택
          </button>
          <button
            type="button"
            onClick={() => setOverride(new Set())}
            disabled={selectedCount === 0}
            className="rounded-lg border border-[#d8dce3] px-3 py-1.5 text-xs font-semibold text-[#1f1f1f] disabled:opacity-40"
          >
            전체 해제
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isPending && <Notice text="항목을 불러오는 중..." />}
        {isError && (
          <Notice
            text={error instanceof Error ? error.message : '항목을 불러오지 못했습니다.'}
            actionLabel="다시 시도"
            onAction={() => void refetch()}
          />
        )}
        {!isPending && !isError && items.length === 0 && (
          <Notice text="검사 항목이 없습니다." />
        )}

        <ul className="space-y-2">
          {items.map((item) => {
            const checked = selected.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-colors',
                    checked ? 'border-[#3c3c3c]' : 'border-[#e8eaed]',
                  )}
                  aria-pressed={checked}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-md border-2',
                      checked
                        ? 'border-[#3c3c3c] bg-[#3c3c3c] text-white'
                        : 'border-[#c5c9d0] bg-white',
                    )}
                    aria-hidden
                  >
                    {checked && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span className="w-8 shrink-0 text-sm font-bold text-[#8b8f96]">
                    {item.itemNo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#1f1f1f]">
                      {item.label}
                    </span>
                    {item.groupName && (
                      <span className="block truncate text-xs text-[#8b8f96]">
                        {item.groupName}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shrink-0 border-t border-[#e8eaed] bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() =>
            onConfirm(
              items.filter((item) => selected.has(item.id)).map((item) => item.id),
              items.map((item) => item.id),
            )
          }
          disabled={selectedCount === 0}
          className="h-12 w-full rounded-xl bg-[#3c3c3c] text-sm font-bold text-white disabled:opacity-40"
        >
          {selectedCount === 0
            ? '항목을 1개 이상 선택하세요'
            : `선택한 ${selectedCount}개 항목으로 검사 시작`}
        </button>
      </div>
    </div>
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
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-4 py-10 text-center">
      <p className="text-sm text-[#8b8f96]">{text}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="text-sm font-semibold underline">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
