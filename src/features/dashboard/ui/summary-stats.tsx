import type { DashboardSummary } from '../model/mock-data';

type SummaryStatsProps = {
  summary: DashboardSummary;
};

export function SummaryStats({ summary }: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      <StatCard label="진행 중" value={summary.inProgress} />
      <StatCard label="오늘 완료" value={summary.completedToday} />
      <StatCard label="미처리 NG" value={summary.pendingNg} emphasize />
    </div>
  );
}

function StatCard({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div
      className={
        emphasize
          ? 'rounded-2xl border border-[#f0b8b4] bg-white px-3 py-4 md:px-4 md:py-5'
          : 'rounded-2xl bg-white px-3 py-4 md:px-4 md:py-5'
      }
    >
      <p className="text-sm text-[#8b8f96] md:text-base">{label}</p>
      <p
        className={
          emphasize
            ? 'mt-2 text-2xl font-bold tracking-tight text-[#d92d20] md:text-3xl'
            : 'mt-2 text-2xl font-bold tracking-tight text-[#1f1f1f] md:text-3xl'
        }
      >
        {value}
        <span className="ml-1 text-base font-semibold md:text-lg">건</span>
      </p>
    </div>
  );
}
