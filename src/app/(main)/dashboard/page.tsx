'use client';

import dayjs from 'dayjs';
import 'dayjs/locale/ko';

import { useAuthStore } from '@/features/auth/session/auth-store';

dayjs.locale('ko');

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const todayLabel = dayjs().format('YYYY년 M월 D일 dddd');

  return (
    <section className="space-y-2">
      <p className="text-sm text-[#8b8f96] md:text-base">
        {todayLabel} · 2라인
      </p>
      <h1 className="text-[1.75rem] font-bold tracking-tight text-[#1f1f1f] md:text-3xl">
        안녕하세요, {user?.name ?? '검사자'} 님
      </h1>
    </section>
  );
}
