'use client';

import { usePathname } from 'next/navigation';

import { AppHeader } from './app-header';
import { BottomNav } from './bottom-nav';

function isDatasheetDetailPath(pathname: string) {
  return /^\/settings\/datasheets\/[^/]+\/?$/.test(pathname);
}

export function ChromeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const focusMode = isDatasheetDetailPath(pathname);

  if (focusMode) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="flex-1 px-5 pb-6 pt-6 md:px-6">{children}</main>
      <BottomNav />
    </>
  );
}
