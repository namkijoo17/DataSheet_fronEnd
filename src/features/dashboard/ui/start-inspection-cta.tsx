import Link from 'next/link';
import { Plus } from 'lucide-react';

export function StartInspectionCta() {
  return (
    <Link
      href="/inspections/new"
      className="flex items-center justify-between gap-4 rounded-2xl bg-[#3c3c3c] px-5 py-5 text-white transition-colors hover:bg-[#2f2f2f] active:bg-[#2a2a2a] md:px-6 md:py-6"
    >
      <div className="min-w-0">
        <p className="text-xl font-bold tracking-tight md:text-2xl">
          신규 검사 시작
        </p>
        <p className="mt-1 text-sm text-white/75 md:text-base">
          데이터시트 선택 후 기번 입력
        </p>
      </div>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-[#1f1f1f] md:size-14">
        <Plus className="size-7 md:size-8" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">신규 검사 시작</span>
      </span>
    </Link>
  );
}
