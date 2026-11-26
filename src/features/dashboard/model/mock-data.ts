export type DashboardSummary = {
  inProgress: number;
  completedToday: number;
  pendingNg: number;
};

export type InProgressInspection = {
  id: string;
  model: string;
  mode: string;
  statusLabel: string;
  completedCount: number;
  totalCount: number;
  /** 이어하기 링크 (기본: /inspections/{id}) */
  href?: string;
};

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  inProgress: 3,
  completedToday: 128,
  pendingNg: 2,
};

export const MOCK_IN_PROGRESS_INSPECTIONS: InProgressInspection[] = [
  {
    id: 'K-2026-00128',
    model: 'MU-100C',
    mode: '기본 검사',
    statusLabel: '보류 14:45',
    completedCount: 10,
    totalCount: 18,
  },
  {
    id: 'K-2026-00115',
    model: 'FI-70',
    mode: '부품출하',
    statusLabel: '진행 13:20',
    completedCount: 4,
    totalCount: 12,
  },
  {
    id: 'K-2026-00098',
    model: 'CH-252',
    mode: '기본 검사',
    statusLabel: '어제 17:10',
    completedCount: 16,
    totalCount: 20,
  },
];
