import { GlobalWorkerOptions, version } from 'pdfjs-dist';

let configured = false;

export function ensurePdfjsWorker() {
  if (configured) return;
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  configured = true;
}
