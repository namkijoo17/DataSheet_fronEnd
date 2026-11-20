export const MAIN_NAV_ITEMS = [
  { href: '/dashboard', label: '홈' },
  { href: '/archive', label: '파일 보관함' },
  { href: '/analysis', label: '분석' },
  { href: '/settings', label: '설정' },
] as const;

export type MainNavHref = (typeof MAIN_NAV_ITEMS)[number]['href'];

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
