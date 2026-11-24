'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Info } from 'lucide-react';

import { useAuthStore } from '@/features/auth/session/auth-store';
import { consumeLogoutNotice } from '@/features/auth/session/logout-notice';
import { ApiError } from '@/shared/api/client';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

import { login } from '@/features/auth/api/auth-api';

import { loginSchema, type LoginFormValues } from '../model/login-schema';
import { BrandHeader } from './brand-header';

export function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [isLocked, setIsLocked] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  useEffect(() => {
    setLogoutNotice(consumeLogoutNotice());
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employeeId: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      const response = await login(values);
      setIsLocked(false);
      setSession(response);
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
        if (error.code === 'ACCOUNT_LOCKED') {
          setIsLocked(true);
        }
        return;
      }

      setServerError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <div className="flex w-full max-w-[480px] flex-col items-center md:max-w-[520px]">
      <BrandHeader />

      {logoutNotice && (
        <p
          role="status"
          className="mt-8 flex w-full items-start gap-2 rounded-2xl border border-[#d8dce3] bg-[#f5f6f7] px-4 py-3 text-base leading-snug text-[#3c3c3c]"
        >
          <Info className="mt-0.5 size-5 shrink-0 text-[#5f6368]" aria-hidden />
          <span>{logoutNotice}</span>
        </p>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className={`${logoutNotice ? 'mt-6' : 'mt-12'} flex w-full flex-col gap-6`}
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="employeeId"
            className="text-base font-normal text-muted-foreground"
          >
            사번 / 아이디
          </Label>
          <Input
            id="employeeId"
            autoComplete="username"
            placeholder="E20418"
            aria-invalid={!!errors.employeeId}
            className="h-14 rounded-2xl border-border bg-background px-4 text-lg focus-visible:border-foreground focus-visible:ring-0 md:text-[1.125rem]"
            {...register('employeeId')}
          />
          {errors.employeeId && (
            <p className="text-base text-destructive">{errors.employeeId.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="password"
            className="text-base font-normal text-muted-foreground"
          >
            비밀번호
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password || !!serverError}
            className="h-14 rounded-2xl border-border bg-background px-4 text-lg focus-visible:border-foreground focus-visible:ring-0 md:text-[1.125rem]"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-base text-destructive">{errors.password.message}</p>
          )}
          {serverError && (
            <p className="flex items-start gap-2 text-base leading-snug text-destructive">
              <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>{serverError}</span>
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || isLocked}
          className="mt-2 h-14 w-full rounded-2xl bg-[#3c3c3c] text-lg font-semibold text-white hover:bg-[#2f2f2f]"
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
        </Button>
      </form>

      <footer className="mt-12 space-y-1 text-center text-base leading-relaxed text-muted-foreground">
        <p>로그인 계정이 검사 담당자로 자동 입력됩니다.</p>
        <p>30분 동안 입력이 없으면 자동 로그아웃됩니다.</p>
      </footer>
    </div>
  );
}
