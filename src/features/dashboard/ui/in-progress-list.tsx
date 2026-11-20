import Link from 'next/link';

import type { InProgressInspection } from '../model/mock-data';

type InProgressListProps = {
  items: InProgressInspection[];
};

export function InProgressList({ items }: InProgressListProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-[#1f1f1f] md:text-xl">
        진행 중인 검사
      </h2>

      <ul className="overflow-hidden rounded-2xl bg-white">
        {items.map((item, index) => {
          const progress = Math.round(
            (item.completedCount / item.totalCount) * 100,
          );

          return (
            <li
              key={item.id}
              className={
                index > 0 ? 'border-t border-[#eceef1] px-4 py-4 md:px-5' : 'px-4 py-4 md:px-5'
              }
            >
              <div className="flex items-center gap-3 md:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-[#1f1f1f] md:text-xl">
                    {item.id}
                  </p>
                  <p className="mt-1 truncate text-sm text-[#8b8f96] md:text-base">
                    {item.model} · {item.mode} · {item.statusLabel}
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#e8eaed]">
                      <div
                        className="h-full rounded-full bg-[#5f6368]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-sm font-medium text-[#5f6368] tabular-nums">
                      {item.completedCount} / {item.totalCount}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/inspections/${item.id}`}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-[#1f1f1f] bg-white px-4 text-sm font-semibold text-[#1f1f1f] transition-colors hover:bg-[#f5f6f7] md:h-12 md:px-5 md:text-base"
                >
                  이어하기
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
