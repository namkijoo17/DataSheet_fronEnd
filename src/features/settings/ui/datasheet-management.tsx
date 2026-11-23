'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, LayoutGrid, List } from 'lucide-react';

import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';

import { formatFileSize, formatLastModified } from '../lib/format';
import type { DatasheetFile } from '../model/datasheet-types';
import { useDatasheets } from '../model/use-datasheets';
import { DatasheetFilePreview } from './datasheet-file-preview';

type ViewMode = 'list' | 'card';

function matchesQuery(file: DatasheetFile, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return file.fileName.toLowerCase().includes(normalized);
}

function getDetailHref(fileName: string) {
  return `/settings/datasheets/${encodeURIComponent(fileName)}`;
}

export function DatasheetManagement() {
  const { data, isPending, isError, error, refetch } = useDatasheets();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const sheets = data ?? [];

  useEffect(() => {
    if (!selectedFileName && sheets.length > 0) {
      setSelectedFileName(sheets[0].fileName);
    }
  }, [selectedFileName, sheets]);

  const filteredSheets = sheets.filter((sheet) =>
    matchesQuery(sheet, deferredQuery),
  );

  if (isPending) {
    return (
      <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-[#8b8f96]">
        데이터시트 목록을 불러오는 중...
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 rounded-xl bg-white px-4 py-8 text-center">
        <p className="text-sm text-[#8b8f96]">
          {error instanceof Error
            ? error.message
            : '데이터시트 목록을 불러오지 못했습니다.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm font-semibold text-[#1f1f1f] underline-offset-2 hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="파일명 검색"
          className="h-12 flex-1 rounded-xl border-[#d8dce3] bg-white px-4 text-base text-[#1f1f1f] placeholder:text-[#9aa0a6]"
        />

        <div
          className="inline-flex h-12 shrink-0 items-center rounded-xl border border-[#d8dce3] bg-white p-1"
          role="group"
          aria-label="보기 방식"
        >
          <button
            type="button"
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-lg transition-colors',
              viewMode === 'list'
                ? 'bg-[#1f1f1f] text-white'
                : 'text-[#8b8f96] hover:bg-[#f5f6f7]',
            )}
          >
            <List className="size-5" aria-hidden />
            <span className="sr-only">목록형</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'card'}
            onClick={() => setViewMode('card')}
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-lg transition-colors',
              viewMode === 'card'
                ? 'bg-[#1f1f1f] text-white'
                : 'text-[#8b8f96] hover:bg-[#f5f6f7]',
            )}
          >
            <LayoutGrid className="size-5" aria-hidden />
            <span className="sr-only">카드형</span>
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <ul className="space-y-3">
          {filteredSheets.map((sheet) => {
            const isSelected = sheet.fileName === selectedFileName;

            return (
              <li key={sheet.fileName}>
                <Link
                  href={getDetailHref(sheet.fileName)}
                  onClick={() => setSelectedFileName(sheet.fileName)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl bg-white px-4 py-4 text-left transition-colors',
                    isSelected
                      ? 'border border-[#5f6368]'
                      : 'border border-transparent',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-[#1f1f1f]">
                      {sheet.fileName}
                    </p>
                    <p className="mt-1 truncate text-sm text-[#8b8f96]">
                      {formatFileSize(sheet.sizeBytes)} ·{' '}
                      {formatLastModified(sheet.lastModified)}
                    </p>
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0 text-[#9aa0a6]"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredSheets.map((sheet) => {
            const isSelected = sheet.fileName === selectedFileName;

            return (
              <li key={sheet.fileName}>
                <Link
                  href={getDetailHref(sheet.fileName)}
                  onClick={() => setSelectedFileName(sheet.fileName)}
                  className={cn(
                    'block overflow-hidden rounded-xl bg-white transition-colors',
                    isSelected
                      ? 'border border-[#5f6368]'
                      : 'border border-transparent',
                  )}
                >
                  <DatasheetFilePreview file={sheet} />
                  <div className="space-y-1 px-4 py-3">
                    <p className="line-clamp-2 text-sm font-bold text-[#1f1f1f]">
                      {sheet.fileName}
                    </p>
                    <p className="truncate text-xs text-[#8b8f96]">
                      {formatFileSize(sheet.sizeBytes)} ·{' '}
                      {formatLastModified(sheet.lastModified)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {filteredSheets.length === 0 && (
        <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-[#8b8f96]">
          {query.trim()
            ? '검색 결과가 없습니다.'
            : '등록된 데이터시트가 없습니다.'}
        </p>
      )}
    </div>
  );
}
