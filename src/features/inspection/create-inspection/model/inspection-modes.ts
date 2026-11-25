export type InspectionModeId = 'BASIC' | 'PARTS_SHIPPING';

export type InspectionModeOption = {
  id: InspectionModeId;
  code: string;
  title: string;
  /** 항목 수 문구에 넣을 숫자 */
  describe: (counts: { total: number; skippable: number }) => string;
};

export const INSPECTION_MODES: InspectionModeOption[] = [
  {
    id: 'BASIC',
    code: '모드 01',
    title: '기본 검사',
    describe: ({ total }) =>
      `모든 필수 항목을 입력하고 자동 판정합니다. ${total}개 항목`,
  },
  {
    id: 'PARTS_SHIPPING',
    code: '모드 02',
    title: '부품출하 모드',
    describe: ({ skippable }) =>
      `기준서에서 SKIP 가능으로 지정된 항목만 건너뛰고, 빈칸은 SKIP 상태로 저장합니다. SKIP 가능 ${skippable}개 항목`,
  },
];
