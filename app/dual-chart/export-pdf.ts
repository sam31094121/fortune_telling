// Capture the existing A4 DOM on the user's device. No birth data leaves the
// browser, and there is no second chart template or server PDF endpoint.
export async function createDualChartPdf(root: HTMLElement, monochrome = false): Promise<{ blob: Blob; pageCount: number }> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  await document.fonts.ready;
  // The print view has already applied the selection. Filtering again by index
  // drops Ziwei-only output and counts fused sections as separate pages.
  const pages = Array.from(root.querySelectorAll<HTMLElement>(':scope > article'));
  if (pages.length < 1) throw new Error('請至少選擇一張卡片進行列印。');
  if (pages.length !== 1) throw new Error('每次只印一張，請選擇八字或紫微後再試。');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const selectedCount = pages.length;
  pdf.setProperties({ title: `神煞易經（${selectedCount}張） · ${monochrome ? '黑白' : '彩色'} A4`, subject: '八字與紫微斗數命盤' });
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    const { width, height } = page.getBoundingClientRect();
    // The print view fits a slightly tall sheet onto one A4 with CSS zoom. getBoundingClientRect() is
    // zoomed while scrollWidth/scrollHeight are not, so bring them to the same scale before comparing.
    const zoom = page.offsetHeight > 0 ? height / page.offsetHeight : 1;
    // Refuse clipping or shrinking a taller layout into an unreadable single page.
    if (height > width * 297 / 210 + 2 || page.scrollWidth * zoom > width + 2 || page.scrollHeight * zoom > height + 2) throw new Error('目前內容超出一張 A4，請返回命盤並回報此問題；PDF 未輸出，避免裁切命盤。');
    // Capture at the sheet's natural size (zoom 1) so the zoomed content fills the whole canvas instead of leaving an empty strip.
    const canvas = await toCanvas(page, { pixelRatio: 3.125, skipFonts: true, backgroundColor: monochrome ? '#ffffff' : '#fffefb', style: { margin: '0', boxShadow: 'none', zoom: '1' } });
    if (index) pdf.addPage('a4', 'portrait');
    pdf.addImage(canvas, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    // Release the large 300dpi canvas before capturing the next page on phones.
    canvas.width = 1; canvas.height = 1;
  }
  return { blob: pdf.output('blob'), pageCount: pdf.getNumberOfPages() };
}
