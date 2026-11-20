import { apiClient } from '@/shared/api/client';

import type { AuthUser, LoginRequest, LoginResponse } from '../login/model/login-types';

export function login(body: LoginRequest) {
  return apiClient<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function refreshSession() {
  return apiClient<LoginResponse>('/api/auth/refresh', {
    method: 'POST',
  });
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
