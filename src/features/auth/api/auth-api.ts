import { apiClient, refreshAccessToken } from '@/shared/api/client';

import type { AuthUser, LoginRequest, LoginResponse } from '../login/model/login-types';
import { useAuthStore } from '../session/auth-store';

export function login(body: LoginRequest) {
  return apiClient<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Access 재발급 (동시 요청 시 1회로 합쳐짐) */
export async function refreshSession(): Promise<LoginResponse> {
  const ok = await refreshAccessToken();
  const state = useAuthStore.getState();

  if (!ok || !state.user) {
    throw new Error('세션을 갱신하지 못했습니다.');
  }

  return {
    tokenType: 'Bearer',
    expiresInMs: Math.max((state.expiresAt ?? Date.now()) - Date.now(), 0),
    refreshExpiresInMs: Math.max(
      (state.refreshExpiresAt ?? Date.now()) - Date.now(),
      0,
    ),
    user: state.user,
  };
}

export function logout() {
  return apiClient<void>('/api/auth/logout', {
    method: 'POST',
  });
}

export function fetchMe() {
  return apiClient<AuthUser>('/api/auth/me', {
    method: 'GET',
  });
}
