'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';
import { formatRevision, useDatasheets, type DatasheetSummary } from '@/features/settings';

type DatasheetPickerProps = {
  onSelect: (sheet: DatasheetSummary) => void;
};

function matchesQuery(sheet: DatasheetSummary, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return (
    sheet.name.toLowerCase().includes(normalized) ||
    sheet.fileName.toLowerCase().includes(normalized)
  );
}

export function DatasheetPicker({ onSelect }: DatasheetPickerProps) {
  const { data, isPending, isError, error, refetch } = useDatasheets();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const sheets = (data ?? []).filter((sheet) => matchesQuery(sheet, deferredQuery));

  return (
    <div className="flex h-svh min-h-0 flex-col bg-[#f4f6f8]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[#e8eaed] bg-white px-3 py-3">
        <Link
          href="/dashboard"
          className="flex size-10 items-center justify-center rounded-lg text-[#1f1f1f] hover:bg-[#f5f6f7]"
          aria-label="홈으로"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="text-lg font-bold text-[#1f1f1f]">데이터시트 선택</h1>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <p className="text-sm text-[#8b8f96]">검사를 진행할 등록된 데이터시트를 선택하세요.</p>

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="코드 · 이름 · 파일명 검색"
          className="h-12 rounded-xl border-[#d8dce3] bg-white px-4 text-base text-[#1f1f1f] placeholder:text-[#9aa0a6]"
        />

        {isPending && (
          <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-[#8b8f96]">
            데이터시트 목록을 불러오는 중...
          </p>
        )}

        {isError && (
          <div className="space-y-3 rounded-xl bg-white px-4 py-8 text-center">
            <p className="text-sm text-[#8b8f96]">
              {error instanceof Error ? error.message : '데이터시트 목록을 불러오지 못했습니다.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm font-semibold text-[#1f1f1f] underline-offset-2 hover:underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {!isPending && !isError && sheets.length === 0 && (
          <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-[#8b8f96]">
            {query.trim()
              ? '검색 결과가 없습니다.'
              : '등록된 데이터시트가 없습니다. 설정에서 먼저 추가하세요.'}
          </p>
        )}

        {!isPending && !isError && sheets.length > 0 && (
          <ul className="space-y-3">
            {sheets.map((sheet) => (
              <li key={sheet.id}>
                <button
                  type="button"
                  onClick={() => onSelect(sheet)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border border-transparent bg-white px-4 py-4 text-left transition-colors',
                    'hover:border-[#d8dce3] active:bg-[#f5f6f7]',
                  )}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f6f7] text-[#5f6368]">
                    <FileText className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-[#1f1f1f]">
                      {sheet.name}
                    </span>
                    <span className="mt-1 block truncate text-sm text-[#8b8f96]">
                      {sheet.fileName}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-[#9aa0a6]" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
