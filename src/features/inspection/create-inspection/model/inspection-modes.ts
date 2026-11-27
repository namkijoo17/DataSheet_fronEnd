export type InspectionModeId = 'BASIC' | 'DEBUG' | 'PARTS_SHIPPING';

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
    id: 'DEBUG',
    code: '모드 02',
    title: '디버깅 모드',
    describe: ({ total }) =>
      `하고 싶은 검사 항목만 골라서 진행합니다. 선택하지 않은 항목은 SKIP으로 저장됩니다. 전체 ${total}개 항목 중 선택`,
  },
  {
    id: 'PARTS_SHIPPING',
    code: '모드 03',
    title: '부품출하 검사 모드',
    describe: ({ skippable }) =>
      `정책상 스킵 가능으로 지정된 항목만 의도적으로 SKIP 표시할 수 있습니다. 스킵 가능 ${skippable}개 항목`,
  },
];
