'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthUser } from '@/features/auth/login/model/login-types';

type AuthState = {
  user: AuthUser | null;
  expiresAt: number | null;
  setSession: (user: AuthUser, expiresInMs: number) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      expiresAt: null,
      setSession: (user, expiresInMs) =>
        set({
          user,
          expiresAt: Date.now() + expiresInMs,
        }),
      clearSession: () =>
        set({
          user: null,
          expiresAt: null,
        }),
    }),
    {
      name: 'datasheet-auth',
    },
  ),
);
