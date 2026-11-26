'use client';

import { useParams } from 'next/navigation';

import { ResumeInspection } from '@/features/inspection/create-inspection';

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const inspectionId = Number(params.id);

  if (!Number.isFinite(inspectionId)) {
    return <div className="p-6 text-sm text-[#8b8f96]">잘못된 검사 번호입니다.</div>;
  }

  return <ResumeInspection inspectionId={inspectionId} />;
}
