'use client';

import type { InspectionSequenceEntry } from '../lib/inspection-sequence';

type InspectionSequencePanelProps = {
  entries: InspectionSequenceEntry[];
  loading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
};

export function InspectionSequencePanel({
  entries,
  loading = false,
  errorMessage,
  onRetry,
}: InspectionSequencePanelProps) {
  return (
    <section className="rounded-2xl bg-[#eceff3] px-4 py-4">
      <h2 className="text-sm font-bold text-[#1f1f1f]">검사 순서</h2>

      {loading && (
        <p className="mt-3 text-sm text-[#8b8f96]">검사 순서를 조회하는 중...</p>
      )}

      {!loading && errorMessage && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-[#8b8f96]">{errorMessage}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-sm font-semibold text-[#1f1f1f] underline-offset-2 hover:underline"
            >
              다시 조회
            </button>
          )}
        </div>
      )}

      {!loading && !errorMessage && entries.length === 0 && (
        <p className="mt-3 text-sm text-[#8b8f96]">
          표시할 검사 순서가 없습니다.
        </p>
      )}

      {!loading && !errorMessage && entries.length > 0 && (
        <ol className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2">
          {entries.map((entry) => (
            <li
              key={entry.itemId}
              className="flex min-w-0 items-baseline gap-1 text-sm"
            >
              <span className="shrink-0 font-semibold text-[#1f1f1f]">
                {entry.order}
              </span>
              <span className="min-w-0 truncate text-[#5f6368]">
                {entry.label}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
