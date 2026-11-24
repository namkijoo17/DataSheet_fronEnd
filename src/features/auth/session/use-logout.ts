'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { logout } from '@/features/auth/api/auth-api';
import { useAuthStore } from '@/features/auth/session/auth-store';
import { setLogoutNotice } from '@/features/auth/session/logout-notice';

export function useLogout() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    setError(null);
    startTransition(async () => {
      try {
        await logout();
      } catch {
        // 서버 호출 실패해도 로컬 세션은 정리
      } finally {
        setLogoutNotice('manual');
        clearSession();
        router.replace('/login');
      }
    });
  };

  return { logout: handleLogout, isPending, error };
}
