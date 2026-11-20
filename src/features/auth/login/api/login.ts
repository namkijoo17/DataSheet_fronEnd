import { apiClient } from '@/shared/api/client';

import type { LoginRequest, LoginResponse } from '../model/login-types';

export function login(body: LoginRequest) {
  return apiClient<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function logout() {
  return apiClient<void>('/api/auth/logout', {
    method: 'POST',
  });
}
