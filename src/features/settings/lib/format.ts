import dayjs from 'dayjs';

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
