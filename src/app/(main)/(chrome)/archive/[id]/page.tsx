'use client';

import { Suspense, use } from 'react';

import { ArchiveDetail } from '@/features/archive';

type ArchiveDetailPageProps = {
  params: Promise<{ id: string }>;
};

function ArchiveDetailContent({ params }: ArchiveDetailPageProps) {
  const { id } = use(params);
  const inspectionId = Number(id);

  if (!Number.isFinite(inspectionId) || inspectionId <= 0) {
    return <div className="p-6 text-sm text-[#8b8f96]">잘못된 검사 번호입니다.</div>;
  }

  return <ArchiveDetail inspectionId={inspectionId} />;
}

export default function ArchiveDetailPage(props: ArchiveDetailPageProps) {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-[#8b8f96]">검사 내역을 불러오는 중...</div>}
    >
      <ArchiveDetailContent {...props} />
    </Suspense>
  );
}
