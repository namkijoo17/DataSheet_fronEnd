'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { isNavActive, MAIN_NAV_ITEMS } from '../model/nav';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="메인 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8eaed] bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-14 max-w-3xl grid-cols-4 md:h-16">
        {MAIN_NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);

          return (
            <li key={item.href} className="relative">
              {active && (
                <span
                  className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-[#1f1f1f] md:inset-x-10"
                  aria-hidden
                />
              )}
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full items-center justify-center px-1 text-center text-[0.9375rem] transition-colors md:text-base',
                  active
                    ? 'font-semibold text-[#1f1f1f]'
                    : 'font-medium text-[#8b8f96]',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
