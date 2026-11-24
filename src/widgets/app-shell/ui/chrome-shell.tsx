'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';

import { AppHeader } from './app-header';
import { BottomNav } from './bottom-nav';

function isDatasheetDetailPath(pathname: string) {
  return /^\/settings\/datasheets\/[^/]+\/?$/.test(pathname);
}

function ChromeShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const focusMode = isDatasheetDetailPath(pathname);

  if (focusMode) {
    return (
      <div className="flex h-svh min-h-0 flex-col overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-5 pb-6 pt-6 md:px-6">{children}</main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  );
}

export function ChromeShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="flex-1 px-5 pb-6 pt-6 md:px-6">{children}</main>
      }
    >
      <ChromeShellInner>{children}</ChromeShellInner>
    </Suspense>
  );
}
