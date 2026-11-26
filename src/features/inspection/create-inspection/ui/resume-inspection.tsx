'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import {
  datasheetDetailQueryKey,
  fetchDatasheetDetail,
} from '@/features/settings';

import { fetchInspectionDetail } from '../api/inspection-api';
import { CreateInspectionFlow } from './create-inspection-flow';

type ResumeInspectionProps = {
  inspectionId: number;
};

/** 진행 중인 검사를 서버에서 불러와 마지막 입력 위치부터 이어서 진행 */
export function ResumeInspection({ inspectionId }: ResumeInspectionProps) {
  const inspectionQuery = useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: () => fetchInspectionDetail(inspectionId),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  const datasheetId = inspectionQuery.data?.datasheetId;
  const datasheetQuery = useQuery({
    queryKey: datasheetDetailQueryKey(datasheetId ?? 0),
    queryFn: () => fetchDatasheetDetail(datasheetId as number),
    enabled: datasheetId != null,
    refetchOnWindowFocus: false,
  });

  if (inspectionQuery.isPending || (datasheetId != null && datasheetQuery.isPending)) {
    return <Message text="검사를 불러오는 중..." />;
  }

  const error = inspectionQuery.error ?? datasheetQuery.error;
  if (error || !inspectionQuery.data || !datasheetQuery.data) {
    return (
      <Message
        text={error instanceof Error ? error.message : '검사를 불러오지 못했습니다.'}
        showDashboardLink
      />
    );
  }

  if (inspectionQuery.data.status === 'COMPLETED') {
    return <Message text="이미 완료된 검사입니다." showDashboardLink />;
  }

  return (
    <CreateInspectionFlow
      resume={{ inspection: inspectionQuery.data, datasheet: datasheetQuery.data }}
    />
  );
}

function Message({ text, showDashboardLink }: { text: string; showDashboardLink?: boolean }) {
  return (
    <div className="flex h-svh flex-col items-center justify-center gap-3 bg-[#f4f6f8] px-4">
      <p className="text-sm text-[#8b8f96]">{text}</p>
      {showDashboardLink && (
        <Link href="/dashboard" className="text-sm font-semibold text-[#1f1f1f] underline">
          대시보드로 돌아가기
        </Link>
      )}
    </div>
  );
}
