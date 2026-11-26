export type JpegPdfPage = {
  jpeg: Uint8Array;
  /** 이미지 픽셀 크기 */
  widthPx: number;
  heightPx: number;
  /** PDF 페이지 크기 (pt) */
  widthPt: number;
  heightPt: number;
};

/** JPEG 이미지를 페이지 전체에 깐 최소 PDF 를 만든다. (외부 라이브러리 없음) */
export function buildPdfFromJpegs(pages: JpegPdfPage[]): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = (id: number) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  // 객체 번호: 1 Catalog, 2 Pages, 페이지마다 (Page, Contents, Image) 3개씩
  const pageId = (i: number) => 3 + i * 3;
  const fmt = (n: number) => n.toFixed(2);

  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');

  startObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  startObject(2);
  const kids = pages.map((_, i) => `${pageId(i)} 0 R`).join(' ');
  push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

  pages.forEach((page, i) => {
    const pid = pageId(i);

    startObject(pid);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(page.widthPt)} ${fmt(page.heightPt)}] ` +
        `/Resources << /XObject << /Im0 ${pid + 2} 0 R >> >> /Contents ${pid + 1} 0 R >>\nendobj\n`,
    );

    const content = `q ${fmt(page.widthPt)} 0 0 ${fmt(page.heightPt)} 0 0 cm /Im0 Do Q`;
    startObject(pid + 1);
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

    startObject(pid + 2);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.widthPx} /Height ${page.heightPx} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    );
    push(page.jpeg);
    push('\nendstream\nendobj\n');
  });

  const objectCount = 2 + pages.length * 3;
  const xrefOffset = length;
  push(`xref\n0 ${objectCount + 1}\n`);
  push('0000000000 65535 f \n');
  for (let id = 1; id <= objectCount; id += 1) {
    push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  push(
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}
