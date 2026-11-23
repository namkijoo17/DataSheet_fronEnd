'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { useDatasheets } from '../model/use-datasheets';
import { getMockFields } from '../model/mock-fields';
import { formatFileSize, formatLastModified } from '../lib/format';
import { DatasheetFieldList } from './datasheet-field-list';
import { DatasheetPdfViewer } from './datasheet-pdf-viewer';

type DatasheetDetailProps = {
  fileName: string;
};

export function DatasheetDetail({ fileName }: DatasheetDetailProps) {
  const { data, isPending, isError, error } = useDatasheets();
  const file = data?.find((item) => item.fileName === fileName);
  const fields = useMemo(() => getMockFields(fileName), [fileName]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const selectedField =
    fields.find((field) => field.id === selectedFieldId) ?? null;

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
          <h1 className="text-xl font-bold break-all text-[#1f1f1f] md:text-2xl">
            {fileName}
          </h1>
          <p className="mt-1 text-sm text-[#8b8f96]">
            {isPending && '파일 정보 불러오는 중...'}
            {isError &&
              (error instanceof Error
                ? error.message
                : '파일 정보를 불러오지 못했습니다.')}
            {file &&
              `${formatFileSize(file.sizeBytes)} · ${formatLastModified(file.lastModified)}`}
            {!isPending && !isError && !file && '목록에 없는 파일일 수 있습니다.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
        <DatasheetPdfViewer
          fileName={fileName}
          contentType={file?.contentType}
          selectedField={selectedField}
        />
        <DatasheetFieldList
          fields={fields}
          selectedFieldId={selectedFieldId}
          onSelect={setSelectedFieldId}
        />
      </div>
    </section>
  );
}
