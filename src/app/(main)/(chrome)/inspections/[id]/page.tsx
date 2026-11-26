'use client';

import { Suspense, use } from 'react';

import { ResumeInspection } from '@/features/inspection/create-inspection';

type InspectionDetailPageProps = {
  params: Promise<{ id: string }>;
};

function InspectionDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const inspectionId = Number(id);

  if (!Number.isFinite(inspectionId)) {
    return <div className="p-6 text-sm text-[#8b8f96]">잘못된 검사 번호입니다.</div>;
  }

  return <ResumeInspection inspectionId={inspectionId} />;
}

export default function InspectionDetailPage({
  params,
}: InspectionDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-[#8b8f96]">검사 정보를 불러오는 중...</div>
      }
    >
      <InspectionDetailContent params={params} />
    </Suspense>
  );
}
