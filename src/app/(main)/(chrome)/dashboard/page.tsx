'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

import {
  InProgressList,
  MOCK_DASHBOARD_SUMMARY,
  StartInspectionCta,
  SummaryStats,
  type InProgressInspection,
} from '@/features/dashboard';
import { useAuthStore } from '@/features/auth/session/auth-store';
import {
  INSPECTION_MODES,
  useInProgressInspections,
} from '@/features/inspection/create-inspection';

dayjs.locale('ko');

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [todayLabel, setTodayLabel] = useState<string | null>(null);
  const inProgress = useInProgressInspections();

  const inProgressItems = useMemo<InProgressInspection[]>(
    () =>
      (inProgress.data ?? []).map((inspection) => ({
        id: inspection.serialNo || `검사 #${inspection.id}`,
        model: inspection.datasheetName,
        mode:
          INSPECTION_MODES.find((mode) => mode.id === inspection.mode)?.title ??
          inspection.mode,
        statusLabel: `저장 ${dayjs(inspection.updatedAt).format('M/D HH:mm')}`,
        completedCount: inspection.answeredCount,
        totalCount: inspection.totalCount,
        href: `/inspections/${inspection.id}`,
      })),
    [inProgress.data],
  );

  useEffect(() => {
    setTodayLabel(dayjs().format('YYYY년 M월 D일 dddd'));
  }, []);

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="space-y-2">
        <p className="text-sm text-[#8b8f96] md:text-base">
          {todayLabel ? `${todayLabel} · 2라인` : '2라인'}
        </p>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-[#1f1f1f] md:text-3xl">
          안녕하세요, {user?.name ?? '검사자'} 님
        </h1>
      </section>

      <StartInspectionCta />
      <SummaryStats
        summary={{
          ...MOCK_DASHBOARD_SUMMARY,
          inProgress: inProgress.data?.length ?? 0,
        }}
      />
      <InProgressList
        items={inProgressItems}
        loading={inProgress.isPending}
        errorMessage={
          inProgress.isError
            ? '진행 중인 검사를 불러오지 못했습니다.'
            : null
        }
      />
    </div>
  );
}
