'use client';

import { useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

import {
  InProgressList,
  StartInspectionCta,
  SummaryStats,
  useDashboardStats,
  type InProgressInspection,
} from '@/features/dashboard';
import {
  INSPECTION_MODES,
  useInProgressInspections,
} from '@/features/inspection/create-inspection';

dayjs.locale('ko');

export default function DashboardPage() {
  const inProgress = useInProgressInspections();
  const stats = useDashboardStats(inProgress.data);

  const inProgressItems = useMemo<InProgressInspection[]>(
    () =>
      (inProgress.data ?? []).map((inspection) => ({
        id: inspection.serialNo || `검사 #${inspection.id}`,
        model: inspection.datasheetName,
        mode:
          INSPECTION_MODES.find((mode) => mode.id === inspection.mode)?.title ?? inspection.mode,
        statusLabel: `저장 ${dayjs(inspection.updatedAt).format('M/D HH:mm')}`,
        completedCount: inspection.answeredCount,
        totalCount: inspection.totalCount,
        href: `/inspections/${inspection.id}`,
      })),
    [inProgress.data],
  );

  return (
    <div className="space-y-6 md:space-y-8">
      <StartInspectionCta />
      <SummaryStats summary={stats} />
      <InProgressList
        items={inProgressItems}
        loading={inProgress.isPending}
        errorMessage={inProgress.isError ? '진행 중인 검사를 불러오지 못했습니다.' : null}
      />
    </div>
  );
}
