'use client';

import { useAuthStore } from '@/features/auth/session/auth-store';
import { useLogout } from '@/features/auth/session/use-logout';
import { Button } from '@/shared/ui/button';

export function AccountManagement() {
  const user = useAuthStore((state) => state.user);
  const { logout, isPending } = useLogout();

  if (!user) {
    return (
      <div className="rounded-2xl bg-white px-5 py-6 text-sm text-[#8b8f96]">
        로그인 정보가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-[#8b8f96]">로그인 계정</p>
        <p className="mt-1 text-lg font-semibold text-[#1f1f1f]">
          {user.name} ({user.employeeId})
        </p>
        <p className="mt-0.5 text-sm text-[#8b8f96]">{user.role}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={logout}
        className="h-12 w-full rounded-xl border-[#d8dce3] text-base font-semibold text-[#1f1f1f]"
      >
        {isPending ? '로그아웃 중...' : '로그아웃'}
      </Button>
    </div>
  );
}
