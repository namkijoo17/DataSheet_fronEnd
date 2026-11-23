'use client';

import { Suspense, use } from 'react';

import { DatasheetDetail } from '@/features/settings/ui/datasheet-detail';

type DatasheetDetailPageProps = {
  params: Promise<{ fileName: string }>;
};

function decodeFileName(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function DatasheetDetailContent({
  params,
}: {
  params: Promise<{ fileName: string }>;
}) {
  const { fileName: rawFileName } = use(params);
  const fileName = decodeFileName(rawFileName);

  return <DatasheetDetail fileName={fileName} />;
}

export default function DatasheetDetailPage({
  params,
}: DatasheetDetailPageProps) {
  return (
    <Suspense
      fallback={
        <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-[#8b8f96]">
          데이터시트를 불러오는 중...
        </p>
      }
    >
      <DatasheetDetailContent params={params} />
    </Suspense>
  );
}
