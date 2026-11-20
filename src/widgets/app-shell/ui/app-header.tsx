'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useAuthStore } from '@/features/auth/session/auth-store';
import { useLogout } from '@/features/auth/session/use-logout';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

type AppHeaderProps = {
  className?: string;
};

export function AppHeader({ className }: AppHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const { logout, isPending } = useLogout();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-[#e8eaed] bg-white',
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center">
          <Image
            src="/brand/ecotronix-logo.png"
            alt="ECOTRONIX CORP."
            width={220}
            height={36}
            priority
            className="h-7 w-auto md:h-8"
          />
        </Link>

        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <span className="truncate text-sm font-medium text-[#1f1f1f] md:text-base">
            {user?.name ?? '—'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={logout}
            className="shrink-0"
          >
            {isPending ? '로그아웃 중...' : '로그아웃'}
          </Button>
        </div>
      </div>
    </header>
  );
}
