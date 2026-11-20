'use client';

import { useAuthStore } from '@/features/auth/session/auth-store';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[#1f1f1f]">설정</h1>
        <p className="text-muted-foreground">데이터시트 관리 및 계정 설정</p>
      </div>

      {user && (
        <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
          <p className="text-sm text-[#8b8f96]">로그인 계정</p>
          <p className="mt-1 text-lg font-semibold text-[#1f1f1f]">
            {user.name} ({user.employeeId})
          </p>
          <p className="mt-0.5 text-sm text-[#8b8f96]">{user.role}</p>
        </div>
      )}
    </section>
  );
}
