'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthUser, LoginResponse } from '@/features/auth/login/model/login-types';

type AuthState = {
  user: AuthUser | null;
  expiresAt: number | null;
  refreshExpiresAt: number | null;
  setSession: (response: LoginResponse) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      expiresAt: null,
      refreshExpiresAt: null,
      setSession: (response) =>
        set({
          user: response.user,
          expiresAt: Date.now() + response.expiresInMs,
          refreshExpiresAt: Date.now() + response.refreshExpiresInMs,
        }),
      clearSession: () =>
        set({
          user: null,
          expiresAt: null,
          refreshExpiresAt: null,
        }),
    }),
    {
      name: 'datasheet-auth',
    },
  ),
);
