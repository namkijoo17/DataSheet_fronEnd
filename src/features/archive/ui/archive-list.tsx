'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Search,
} from 'lucide-react';

import {
  useCompletedInspections,
  type InspectionSummaryResponse,
} from '@/features/inspection/create-inspection';
import { cn } from '@/shared/lib/utils';

import {
  downloadResultFile,
  formatDateTime,
  openResultFile,
  sortTime,
} from '../lib/result-file';

type FolderGroup = {
  datasheetId: number;
  name: string;
  /** 최신순 정렬된 파일 목록 */
  items: InspectionSummaryResponse[];
  latestAt: string | null;
  ngFileCount: number;
};

/** 데이터시트 단위로 파일을 묶는다. 폴더·파일 모두 최신순 */
function buildFolders(files: InspectionSummaryResponse[]): FolderGroup[] {
  const map = new Map<number, FolderGroup>();
  for (const item of files) {
    let group = map.get(item.datasheetId);
    if (!group) {
      group = {
        datasheetId: item.datasheetId,
        name: item.datasheetName,
        items: [],
        latestAt: null,
        ngFileCount: 0,
      };
      map.set(item.datasheetId, group);
    }
    group.items.push(item);
    if ((item.ngCount ?? 0) > 0) group.ngFileCount += 1;
    const at = sortTime(item);
    if (!group.latestAt || at > group.latestAt) group.latestAt = at;
  }

  return [...map.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => sortTime(b).localeCompare(sortTime(a))),
    }))
    .sort((a, b) => (b.latestAt ?? '').localeCompare(a.latestAt ?? ''));
}

function matchesKeyword(item: InspectionSummaryResponse, needle: string) {
  return [item.fileName, item.datasheetName, item.serialNo, item.unit, item.inspector]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(needle));
}

export function ArchiveList() {
  const { data, isPending, isError, error, refetch } = useCompletedInspections();
  const [keyword, setKeyword] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const files = useMemo(() => (data ?? []).filter((item) => item.fileName), [data]);
  const folders = useMemo(() => buildFolders(files), [files]);

  const needle = keyword.trim().toLowerCase();
  const searching = needle.length > 0;
  const searchResults = useMemo(
    () =>
      searching
        ? files
            .filter((item) => matchesKeyword(item, needle))
            .sort((a, b) => sortTime(b).localeCompare(sortTime(a)))
        : [],
    [files, needle, searching],
  );

  const currentFolder = folders.find((folder) => folder.datasheetId === folderId) ?? null;

  const runFile = async (
    item: InspectionSummaryResponse,
    action: (id: number, fileName: string | null) => Promise<void>,
    fallbackMessage: string,
  ) => {
    if (busyId != null) return;
    setBusyId(item.id);
    try {
      await action(item.id, item.fileName);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : fallbackMessage);
    } finally {
      setBusyId(null);
    }
  };

  const open = (item: InspectionSummaryResponse) =>
    runFile(item, openResultFile, '파일을 열지 못했습니다.');
  const download = (item: InspectionSummaryResponse) =>
    runFile(item, downloadResultFile, '파일을 다운로드하지 못했습니다.');

  const showFolderGrid = !searching && currentFolder == null;
  const showFolderFiles = !searching && currentFolder != null;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1f1f1f]">파일 보관함</h1>
          <p className="mt-1 text-sm text-[#8b8f96]">
            검사 완료 시 저장된 결과 PDF 를 데이터시트별 폴더로 보관합니다.
          </p>
        </div>
        {data && (
          <p className="shrink-0 text-sm font-semibold text-[#5f6368]">
            {folders.length}개 폴더 · 총 {files.length}건
          </p>
        )}
      </div>

      <label className="flex h-11 items-center gap-2 rounded-xl border border-[#e0e3e8] bg-white px-3">
        <Search className="size-4 shrink-0 text-[#9aa0a6]" />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="파일명, 데이터시트, 기번, 호기, 검사자 검색"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9aa0a6]"
        />
      </label>

      {showFolderFiles && (
        <nav className="flex items-center gap-1.5 text-sm">
          <button
            type="button"
            onClick={() => setFolderId(null)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-[#5f6368] hover:bg-[#eceef1]"
          >
            <ChevronLeft className="size-4" />
            전체 폴더
          </button>
          <ChevronRight className="size-3.5 text-[#9aa0a6]" />
          <span className="truncate font-bold text-[#1f1f1f]">{currentFolder.name}</span>
        </nav>
      )}

      {isPending && <Message text="불러오는 중..." />}

      {isError && (
        <div className="space-y-2 rounded-2xl bg-white px-4 py-8 text-center">
          <p className="text-sm text-[#b91c1c]">
            {error instanceof Error ? error.message : '목록을 불러오지 못했습니다.'}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm font-semibold underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {!isPending && !isError && files.length === 0 && (
        <Message text="저장된 검사 파일이 없습니다. 검사를 완료하면 이곳에 보관됩니다." />
      )}

      {!isPending && !isError && searching && searchResults.length === 0 && (
        <Message text="검색 결과가 없습니다." />
      )}

      {/* 1) 검색: 전체 파일을 대상으로 목록 표시 */}
      {searching && searchResults.length > 0 && (
        <FileList
          items={searchResults}
          showFolder
          busyId={busyId}
          onOpen={open}
          onDownload={download}
        />
      )}

      {/* 2) 폴더 목록 */}
      {showFolderGrid && folders.length > 0 && (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {folders.map((folder) => (
            <li key={folder.datasheetId}>
              <button
                type="button"
                onClick={() => setFolderId(folder.datasheetId)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#e8eaed] bg-white px-4 py-3.5 text-left transition-colors hover:border-[#c7ccd4] hover:bg-[#fafbfc]"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f6f8]">
                  <Folder className="size-5 text-[#5f6368]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#1f1f1f]">{folder.name}</p>
                  <p className="mt-0.5 text-xs text-[#8b8f96]">
                    파일 {folder.items.length}건 · 최근 {formatDateTime(folder.latestAt)}
                  </p>
                </div>
                {folder.ngFileCount > 0 && (
                  <span className="shrink-0 rounded-full bg-[#fef2f2] px-2 py-0.5 text-[11px] font-bold text-[#b91c1c]">
                    NG {folder.ngFileCount}
                  </span>
                )}
                <ChevronRight className="size-4 shrink-0 text-[#9aa0a6]" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 3) 폴더 안 파일 목록 */}
      {showFolderFiles && (
        <FileList
          items={currentFolder.items}
          showFolder={false}
          busyId={busyId}
          onOpen={open}
          onDownload={download}
        />
      )}
    </section>
  );
}

function FileList({
  items,
  showFolder,
  busyId,
  onOpen,
  onDownload,
}: {
  items: InspectionSummaryResponse[];
  showFolder: boolean;
  busyId: number | null;
  onOpen: (item: InspectionSummaryResponse) => void;
  onDownload: (item: InspectionSummaryResponse) => void;
}) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const busy = busyId === item.id;
        const ng = (item.ngCount ?? 0) > 0;
        return (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-2xl border border-[#e8eaed] bg-white px-4 py-3.5 transition-colors hover:border-[#c7ccd4]"
          >
            <Link
              href={`/archive/${item.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f6f8]">
                <FileText className="size-5 text-[#5f6368]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-[#1f1f1f]">{item.fileName}</p>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
                      ng ? 'bg-[#fef2f2] text-[#b91c1c]' : 'bg-[#ecfdf3] text-[#166534]',
                    )}
                  >
                    {ng ? `NG ${item.ngCount}` : 'OK'}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#5f6368]">
                  {showFolder ? `${item.datasheetName} · ` : ''}
                  {item.serialNo ? `기번 ${item.serialNo}` : '기번 없음'}
                </p>
                <p className="mt-0.5 text-xs text-[#8b8f96]">
                  {item.inspector || '-'} · {formatDateTime(sortTime(item))}
                </p>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => onOpen(item)}
                className="flex h-9 items-center gap-1 rounded-lg border border-[#d8dce3] px-2.5 text-xs font-semibold text-[#1f1f1f] disabled:opacity-50"
              >
                <ExternalLink className="size-3.5" />
                열기
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDownload(item)}
                className="flex h-9 items-center gap-1 rounded-lg bg-[#3c3c3c] px-2.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Download className="size-3.5" />
                저장
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Message({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-[#8b8f96]">
      {text}
    </div>
  );
}
