/** 시트와 무관하게 고정되는 기본정보 필드 키 */
export const BASIC_INFO_FIELD = {
  serialNo: 'serialNo',
  unit: 'unit',
  line: 'line',
  inspectDate: 'inspectDate',
  inspector: 'inspector',
  temperature: 'temperature',
  humidity: 'humidity',
} as const;

export type BasicInfoFieldKey =
  (typeof BASIC_INFO_FIELD)[keyof typeof BASIC_INFO_FIELD];

/** 부품 번호 슬롯 (고정 6칸) */
export const PART_NUMBER_SLOTS = [
  'TempNo',
  'LCDNo1',
  'PCBNo1',
  'PCBNo2',
  'PCBNo3',
  'PCBNo4',
] as const;

export type PartNumberSlot = (typeof PART_NUMBER_SLOTS)[number];

/** 유닛트 기본 선택지 (시트에 슬롯이 없을 때) */
export const DEFAULT_UNIT_OPTIONS = ['MU-100C', 'MU-100C-CI', 'CH-252'] as const;

export type BasicInfoFormValues = {
  serialNo: string;
  unit: string;
  line: string;
  inspectDate: string;
  inspector: string;
  temperature: string;
  humidity: string;
  parts: Record<PartNumberSlot, string>;
};

export function emptyBasicInfoValues(
  inspector = '',
): BasicInfoFormValues {
  return {
    serialNo: '',
    unit: '',
    line: '',
    inspectDate: new Date().toISOString().slice(0, 10),
    inspector,
    temperature: '',
    humidity: '',
    parts: {
      TempNo: '',
      LCDNo1: '',
      PCBNo1: '',
      PCBNo2: '',
      PCBNo3: '',
      PCBNo4: '',
    },
  };
}

export function isBasicInfoComplete(values: BasicInfoFormValues) {
  if (!values.serialNo.trim()) return false;
  if (!values.unit.trim()) return false;
  if (!values.inspectDate.trim()) return false;
  if (!values.inspector.trim()) return false;
  return PART_NUMBER_SLOTS.every((slot) => values.parts[slot].trim());
}

export function countFilledParts(values: BasicInfoFormValues) {
  const filled = PART_NUMBER_SLOTS.filter((slot) =>
    values.parts[slot].trim(),
  ).length;
  return { filled, total: PART_NUMBER_SLOTS.length };
}
