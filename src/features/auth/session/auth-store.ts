'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthUser, LoginResponse } from '@/features/auth/login/model/login-types';

type AuthState = {
  accessToken: string | null;
  tokenType: string | null;
  expiresAt: number | null;
  user: AuthUser | null;
  setSession: (response: LoginResponse) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      tokenType: null,
      expiresAt: null,
      user: null,
      setSession: (response) =>
        set({
          accessToken: response.accessToken,
          tokenType: response.tokenType,
          expiresAt: Date.now() + response.expiresInMs,
          user: response.user,
        }),
      clearSession: () =>
        set({
          accessToken: null,
          tokenType: null,
          expiresAt: null,
          user: null,
        }),
    }),
    {
      name: 'datasheet-auth',
    },
  ),
);
