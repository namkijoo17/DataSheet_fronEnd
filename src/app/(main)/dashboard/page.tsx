'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

import {
  InProgressList,
  MOCK_DASHBOARD_SUMMARY,
  MOCK_IN_PROGRESS_INSPECTIONS,
  StartInspectionCta,
  SummaryStats,
} from '@/features/dashboard';
import { useAuthStore } from '@/features/auth/session/auth-store';

dayjs.locale('ko');

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [todayLabel, setTodayLabel] = useState<string | null>(null);

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
      <SummaryStats summary={MOCK_DASHBOARD_SUMMARY} />
      <InProgressList items={MOCK_IN_PROGRESS_INSPECTIONS} />
    </div>
  );
}
