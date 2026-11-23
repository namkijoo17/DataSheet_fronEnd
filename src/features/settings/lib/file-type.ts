import type { DatasheetFile } from '../model/datasheet-types';

export function isPdfFile(file: DatasheetFile) {
  return (
    file.contentType.includes('pdf') ||
    file.fileName.toLowerCase().endsWith('.pdf')
  );
}

export function isImageFile(file: DatasheetFile) {
  return (
    file.contentType.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif)$/i.test(file.fileName)
  );
}
