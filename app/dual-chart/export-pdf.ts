// Capture the existing A4 DOM on the user's device. No birth data leaves the
// browser, and there is no second chart template or server PDF endpoint.
export async function createDualChartPdf(root: HTMLElement, monochrome = false): Promise<Blob> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  await document.fonts.ready;
  const pages = Array.from(root.querySelectorAll<HTMLElement>(':scope > article'));
  if (pages.length !== 2) throw new Error('請先生成兩張命盤，再開啟列印專用版。');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({ title: `雙命盤 · ${monochrome ? '黑白' : '彩色'} A4`, subject: '八字與紫微斗數命盤' });
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    const { width, height } = page.getBoundingClientRect();
    // Refuse clipping or shrinking a taller layout into an unreadable single page.
    if (height > width * 297 / 210 + 2) throw new Error('目前內容超出 A4 紙張，請使用瀏覽器列印分頁；PDF 未輸出，避免裁切命盤。');
    const canvas = await toCanvas(page, { pixelRatio: 3.125, skipFonts: true, backgroundColor: monochrome ? '#ffffff' : '#fffefb', style: { margin: '0', boxShadow: 'none' } });
    if (index) pdf.addPage('a4', 'portrait');
    pdf.addImage(canvas, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    // Release the large 300dpi canvas before capturing the next page on phones.
    canvas.width = 1; canvas.height = 1;
  }
  return pdf.output('blob');
}
