'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  ensureValidSession,
  getApiBaseUrl,
} from '@/shared/api/client';

import { useAuthStore } from './auth-store';
import { setLogoutNotice } from './logout-notice';
import {
  ACCESS_REFRESH_MARGIN_MS,
  IDLE_LOGOUT_MS,
} from './session-constants';

/**
 * 메인 영역 세션 유지:
 * - 미로그인 시 로그인으로 이동
 * - Access 만료 전 선제 refresh
 * - 30분 미사용 시 로그아웃
 */
export function AuthSessionManager() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [hydrated, setHydrated] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useAuthStore.persist.hasHydrated());
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/login');
    }
  }, [hydrated, user, router]);

  // Access 만료 임박 시 선제 갱신
  useEffect(() => {
    if (!hydrated || !user || expiresAt == null) return;

    const delay = Math.max(expiresAt - Date.now() - ACCESS_REFRESH_MARGIN_MS, 0);
    const timer = setTimeout(() => {
      void ensureValidSession();
    }, delay);

    return () => clearTimeout(timer);
  }, [hydrated, user, expiresAt]);

  // 탭 복귀 시 세션 점검
  useEffect(() => {
    if (!hydrated || !user) return;

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void ensureValidSession();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [hydrated, user]);

  // 30분 미사용 자동 로그아웃
  useEffect(() => {
    if (!hydrated || !user) return;

    const logoutIdle = async () => {
      try {
        await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // 로컬 세션만 정리
      } finally {
        setLogoutNotice('idle');
        clearSession();
        router.replace('/login');
        window.alert('30분 동안 사용이 없어 자동 로그아웃되었습니다.');
      }
    };

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        void logoutIdle();
      }, IDLE_LOGOUT_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [hydrated, user, clearSession, router]);

  return null;
}
