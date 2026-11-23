'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { getItemPdfRegion } from '../lib/pdf-region';
import { formatRevision } from '../lib/format';
import { useDatasheetDetail } from '../model/use-datasheet-detail';
import { DatasheetFieldList } from './datasheet-field-list';
import { DatasheetPdfViewer } from './datasheet-pdf-viewer';

type DatasheetDetailProps = {
  datasheetId: number;
};

export function DatasheetDetail({ datasheetId }: DatasheetDetailProps) {
  const { data, isPending, isError, error } = useDatasheetDetail(datasheetId);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const selectedItem = useMemo(
    () => data?.items.find((item) => item.id === selectedItemId) ?? null,
    [data?.items, selectedItemId],
  );

  const selectedRegion = useMemo(() => {
    if (!data || !selectedItem) return null;
    return getItemPdfRegion(selectedItem, data);
  }, [data, selectedItem]);

  if (isPending) {
    return (
      <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-[#8b8f96]">
        데이터시트 정보를 불러오는 중...
      </p>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-3">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#5f6368] hover:text-[#1f1f1f]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          데이터시트 목록
        </Link>
        <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-[#8b8f96]">
          {error instanceof Error
            ? error.message
            : '데이터시트 정보를 불러오지 못했습니다.'}
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-3">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#5f6368] hover:text-[#1f1f1f]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          데이터시트 목록
        </Link>

        <div>
          <p className="text-sm text-[#8b8f96]">
            {data.code} · {formatRevision(data.revision)}
          </p>
          <h1 className="mt-1 text-xl font-bold break-all text-[#1f1f1f] md:text-2xl">
            {data.name}
          </h1>
          <p className="mt-1 text-sm text-[#8b8f96]">
            항목 {data.items.length}개 · {data.fileName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
        <DatasheetPdfViewer
          datasheetId={data.id}
          selectedLabel={selectedItem?.label}
          selectedRegion={selectedRegion}
        />
        <DatasheetFieldList
          items={data.items}
          selectedItemId={selectedItemId}
          onSelect={setSelectedItemId}
        />
      </div>
    </section>
  );
}
