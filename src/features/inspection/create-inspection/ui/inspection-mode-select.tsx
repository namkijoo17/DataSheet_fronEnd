'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import {
  normalizeDatasheetItems,
  useDatasheetDetail,
} from '@/features/settings';

import {
  buildInspectionSequence,
  countInspectionItems,
} from '../lib/inspection-sequence';
import {
  INSPECTION_MODES,
  type InspectionModeId,
} from '../model/inspection-modes';
import { InspectionSequencePanel } from './inspection-sequence-panel';

type InspectionModeSelectProps = {
  datasheetId: number;
  datasheetLabel: string;
  metaLabel?: string;
  actionLabel?: string;
  /** 처음 선택돼 있을 모드 (이미 시작한 검사로 돌아온 경우) */
  initialMode?: InspectionModeId;
  onBack: () => void;
  onStart: (mode: InspectionModeId) => void;
};

function RadioMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
        selected ? 'border-[#3c3c3c]' : 'border-[#c5c9d0]',
      )}
      aria-hidden
    >
      {selected && <span className="size-2.5 rounded-full bg-[#3c3c3c]" />}
    </span>
  );
}

export function InspectionModeSelect({
  datasheetId,
  datasheetLabel,
  metaLabel,
  actionLabel,
  initialMode = 'BASIC',
  onBack,
  onStart,
}: InspectionModeSelectProps) {
  const { data, isPending, isError, error, refetch, isFetching } =
    useDatasheetDetail(datasheetId);
  const [mode, setMode] = useState<InspectionModeId>(initialMode);

  const items = useMemo(
    () => normalizeDatasheetItems(data?.items ?? []),
    [data],
  );
  const counts = useMemo(() => countInspectionItems(items), [items]);
  const sequence = useMemo(() => buildInspectionSequence(items), [items]);

  const selectedMode =
    INSPECTION_MODES.find((entry) => entry.id === mode) ?? INSPECTION_MODES[0];
  const loading = isPending || (isFetching && !data);

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
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-[#1f1f1f]">
          검사 모드 선택
        </h1>
        <p className="max-w-[46%] shrink-0 truncate text-right text-xs text-[#8b8f96]">
          {metaLabel
            ? `${metaLabel}${datasheetLabel ? ` · ${datasheetLabel}` : ''}`
            : datasheetLabel}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="space-y-3" role="radiogroup" aria-label="검사 모드">
          {INSPECTION_MODES.map((option) => {
            const selected = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMode(option.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl bg-white px-4 py-4 text-left transition-colors',
                  selected
                    ? 'border-2 border-[#3c3c3c]'
                    : 'border-2 border-transparent',
                )}
              >
                <RadioMark selected={selected} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-[#8b8f96]">
                    {option.code}
                  </span>
                  <span className="mt-1 block text-lg font-bold text-[#1f1f1f]">
                    {option.title}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-[#8b8f96]">
                    {loading
                      ? '항목 수를 조회하는 중...'
                      : option.describe(counts)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <InspectionSequencePanel
          entries={sequence}
          loading={loading}
          errorMessage={
            isError
              ? error instanceof Error
                ? error.message
                : '검사 순서를 불러오지 못했습니다.'
              : null
          }
          onRetry={() => void refetch()}
        />
      </div>

      <div className="shrink-0 border-t border-[#e8eaed] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={loading || isError || items.length === 0}
          onClick={() => onStart(mode)}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#3c3c3c] text-base font-bold text-white transition-colors hover:bg-[#2f2f2f] disabled:opacity-40"
        >
          {actionLabel ?? `${selectedMode.title} 시작`}
        </button>
      </div>
    </div>
  );
}
