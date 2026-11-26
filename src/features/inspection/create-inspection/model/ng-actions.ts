/** NG 발생 시 작업자가 고르는 처리 방법 */
export type NgAction = 'CONTINUE' | 'END' | 'RECHECK';

export type NgActionOption = {
  id: NgAction;
  title: string;
  description: string;
};

export const NG_ACTION_OPTIONS: NgActionOption[] = [
  {
    id: 'CONTINUE',
    title: '다음 항목 검사로 계속',
    description: '현재 항목 NG 확정 후 다음 검사 진행',
  },
  {
    id: 'END',
    title: '검사 종료 및 부적합 등록',
    description: 'NG 상태로 검사를 종료하고 부적합으로 등록',
  },
  {
    id: 'RECHECK',
    title: 'NG 항목만 재검증',
    description: 'NG 항목 재검사 후 최종 확정',
  },
];
