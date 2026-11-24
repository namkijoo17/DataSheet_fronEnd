'use client';

import { Suspense, use } from 'react';

import { DatasheetDetail } from '@/features/settings/ui/datasheet-detail';

type DatasheetDetailPageProps = {
  params: Promise<{ id: string }>;
};

function DatasheetDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const datasheetId = Number(rawId);

  if (!Number.isFinite(datasheetId) || datasheetId <= 0) {
    return (
      <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-[#8b8f96]">
        올바르지 않은 데이터시트입니다.
      </p>
    );
  }

  return <DatasheetDetail datasheetId={datasheetId} />;
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
