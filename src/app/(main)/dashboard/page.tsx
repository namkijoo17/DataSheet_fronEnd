'use client';

import { useLogout } from '@/features/auth/session/use-logout';
import { useAuthStore } from '@/features/auth/session/auth-store';
import { Button } from '@/shared/ui/button';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { logout, isPending } = useLogout();

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {user && (
            <p className="mt-1 text-muted-foreground">
              {user.name} ({user.employeeId}) · {user.role}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={logout}
        >
          {isPending ? '로그아웃 중...' : '로그아웃'}
        </Button>
      </div>
    </div>
  );
}
