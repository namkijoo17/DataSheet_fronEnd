'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';

import { AppHeader } from './app-header';
import { BottomNav } from './bottom-nav';

function isDatasheetDetailPath(pathname: string) {
  return /^\/settings\/datasheets\/[^/]+\/?$/.test(pathname);
}

function isInspectionModeFocusPath(pathname: string) {
  // 검사 진행 화면(신규 시작 /inspections/new, 이어하기 /inspections/{id})은
  // 자체 헤더/하단 버튼을 쓰므로 앱 헤더·하단 탭을 숨긴다
  return (
    pathname === '/inspections/new' ||
    pathname.startsWith('/inspections/new/') ||
    /^\/inspections\/\d+\/?$/.test(pathname)
  );
}

function ChromeShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const focusMode =
    isDatasheetDetailPath(pathname) || isInspectionModeFocusPath(pathname);

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
