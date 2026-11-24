import { useAuthStore } from '@/features/auth/session/auth-store';
import { setLogoutNotice } from '@/features/auth/session/logout-notice';
import { ACCESS_REFRESH_MARGIN_MS } from '@/features/auth/session/session-constants';
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

function redirectToLogin(reason: 'expired' = 'expired') {
  if (typeof window === 'undefined') return;
  const { pathname } = window.location;
  if (pathname === '/login' || pathname.startsWith('/login/')) return;
  setLogoutNotice(reason);
  window.location.replace('/login');
}

let refreshPromise: Promise<boolean> | null = null;

/** Refresh 쿠키로 Access 재발급. 실패 시 세션 정리. */
export async function refreshAccessToken(): Promise<boolean> {
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
        setLogoutNotice('expired');
        useAuthStore.getState().clearSession();
        return false;
      }

      const body = (await response.json()) as LoginResponse;
      useAuthStore.getState().setSession(body);
      return true;
    } catch {
      setLogoutNotice('expired');
      useAuthStore.getState().clearSession();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Access가 곧 만료되거나 이미 만료면 refresh.
 * Refresh도 만료면 로그인으로 보냄.
 */
export async function ensureValidSession(): Promise<boolean> {
  const { expiresAt, refreshExpiresAt } = useAuthStore.getState();
  const now = Date.now();

  if (refreshExpiresAt != null && now >= refreshExpiresAt) {
    setLogoutNotice('expired');
    useAuthStore.getState().clearSession();
    redirectToLogin();
    return false;
  }

  if (expiresAt != null && now < expiresAt - ACCESS_REFRESH_MARGIN_MS) {
    return true;
  }

  const ok = await refreshAccessToken();
  if (!ok) {
    redirectToLogin();
  }
  return ok;
}

async function authenticatedFetch(path: string, init?: RequestInit) {
  const request = () =>
    fetch(`${getBaseUrl()}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...init?.headers,
      },
    });

  let response = await request();

  if (response.status === 401 && !AUTH_SKIP_REFRESH.has(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await request();
    } else {
      redirectToLogin();
    }
  }

  return response;
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;

  if (response.status === 401) {
    setLogoutNotice('expired');
    useAuthStore.getState().clearSession();
    redirectToLogin();
  }

  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  throw new ApiError(
    response.status,
    body?.code ?? 'UNKNOWN',
    body?.message ?? '요청에 실패했습니다.',
  );
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  await throwIfNotOk(response);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiClientBlob(path: string, init?: RequestInit): Promise<Blob> {
  const response = await authenticatedFetch(path, init);
  await throwIfNotOk(response);
  return response.blob();
}

/** multipart 업로드. Content-Type 은 브라우저가 boundary 포함해 설정 */
export async function apiClientFormData<T>(
  path: string,
  formData: FormData,
  init?: Omit<RequestInit, 'body'>,
): Promise<T> {
  const response = await authenticatedFetch(path, {
    ...init,
    method: init?.method ?? 'POST',
    body: formData,
  });

  await throwIfNotOk(response);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl() {
  return getBaseUrl();
}
