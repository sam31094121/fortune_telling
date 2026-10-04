/**
 * 鬼魅阿修羅 - 秘卷下載工具
 * 支持 PDF、圖片下載
 */

/**
 * 下載元素為 PDF
 * @param element - 要下載的 DOM 元素
 * @param filename - PDF 檔案名稱
 */
export async function downloadAsPDF(element: HTMLElement, filename: string): Promise<boolean> {
  try {
    // 動態加載 html2pdf 庫
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

    return new Promise((resolve) => {
      script.onload = () => {
        const opt = {
          margin: 10,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
        };

        // @ts-ignore - html2pdf is loaded dynamically
        window.html2pdf().set(opt).from(element).save();
        resolve(true);
      };

      script.onerror = () => {
        console.error('Failed to load html2pdf library');
        resolve(false);
      };

      document.head.appendChild(script);
    });
  } catch (err) {
    console.error('PDF download failed:', err);
    return false;
  }
}

/**
 * 下載元素為圖片
 * @param element - 要下載的 DOM 元素
 * @param filename - 圖片檔案名稱
 */
export async function downloadAsImage(element: HTMLElement, filename: string): Promise<boolean> {
  try {
    // 動態加載 html2canvas 庫
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

    return new Promise((resolve) => {
      script.onload = async () => {
        try {
          // @ts-ignore - html2canvas is loaded dynamically
          const canvas = await window.html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
          });

          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/jpeg', 0.95);
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          resolve(true);
        } catch (err) {
          console.error('Image download failed:', err);
          resolve(false);
        }
      };

      script.onerror = () => {
        console.error('Failed to load html2canvas library');
        resolve(false);
      };

      document.head.appendChild(script);
    });
  } catch (err) {
    console.error('Image download setup failed:', err);
    return false;
  }
}

/**
 * 複製文字到剪貼板
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
}

/**
 * 生成秘卷文字內容（用於複製或匯出）
 */
export function generateScrollText(data: {
  title: string;
  birthDate: string;
  gender: string;
  impressions: string[];
}): string {
  const genderText = data.gender === 'female' ? '女性' : '男性';
  const impressionsText = data.impressions.map((imp) => `• ${imp}`).join('\n');

  return `
鬼魅阿修羅
本命阿修羅｜四柱隱影解盤

═══════════════════════════

生辰資料
日期：${data.birthDate}
性別：${genderText}

═══════════════════════════

核心印記
${impressionsText}

═══════════════════════════

解盤文案
別人還沒有看見風暴，阿修羅先看見。
命盤是戰場，不是保護區，你已經站上去了。

═══════════════════════════

立即開啟你的阿修羅秘卷
剖析四柱陰影、隱性衝突與內在力量。
點印記名稱查看其力量與駕馭之道。
  `.trim();
}

/**
 * 生成下載檔案名稱
 */
export function generateFilename(type: 'pdf' | 'image' | 'text'): string {
  const date = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const baseFilename = `阿修羅秘卷_${date}`;

  switch (type) {
    case 'pdf':
      return `${baseFilename}.pdf`;
    case 'image':
      return `${baseFilename}.jpg`;
    case 'text':
      return `${baseFilename}.txt`;
    default:
      return baseFilename;
  }
}
