import { useAuthStore } from '@/features/auth/session/auth-store';
import type { LoginResponse } from '@/features/auth/login/model/login-types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiErrorBody = {
  code?: string;
  message?: string;
};

const AUTH_SKIP_REFRESH = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
]);

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        useAuthStore.getState().clearSession();
        return false;
      }

      const body = (await response.json()) as LoginResponse;
      useAuthStore.getState().setSession(body);
      return true;
    } catch {
      useAuthStore.getState().clearSession();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const request = () =>
    fetch(`${getBaseUrl()}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

  let response = await request();

  if (
    response.status === 401 &&
    !AUTH_SKIP_REFRESH.has(path) &&
    (await refreshAccessToken())
  ) {
    response = await request();
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      body?.code ?? 'UNKNOWN',
      body?.message ?? '요청에 실패했습니다.',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
