import dayjs from 'dayjs';

import type { DatasheetItem } from '../model/datasheet-types';

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatLastModified(value: string) {
  const date = dayjs(value);
  if (!date.isValid()) return '-';
  return date.format('YYYY.MM.DD HH:mm');
}

export function formatRevision(revision: number) {
  return `Rev.${String(revision).padStart(2, '0')}`;
}

export function formatItemRange(item: DatasheetItem) {
  if (item.inputType === 'OK_NG') return 'OK / NG';
  if (item.inputType === 'CHECK') {
    const count = item.slots?.length ?? item.arraySize ?? 0;
    return count > 0 ? `체크 ${count}칸` : '체크';
  }

  const min = item.minValue;
  const max = item.maxValue;
  const unit = item.unit ? ` ${item.unit}` : '';

  if (min != null && max != null) return `${min} ~ ${max}${unit}`;
  if (min != null) return `${min} 이상${unit}`;
  if (max != null) return `${max} 이하${unit}`;

  switch (item.inputType) {
    case 'NUMBER':
      return `숫자${unit}`;
    case 'TEXT':
      return '텍스트';
    case 'ENGLISH':
      return '영문';
    case 'MIXED':
      return '영문/숫자';
    default:
      return '-';
  }
}
