import puppeteer from 'puppeteer';

/**
 * Движок преобразования HTML → PDF на headless Chrome (Puppeteer).
 *
 * Жизненный цикл браузера управляется явно (ленивый запуск + close()), один
 * инстанс переиспользуется для всех бланков, чтобы не платить за перезапуск
 * Chromium на каждую запись (GRASP: контроль ресурса в одном месте).
 */
export class PdfEngine {
  constructor(launchOptions = {}) {
    this._launchOptions = { args: ['--no-sandbox'], ...launchOptions };
    this._browser = null;
  }

  async _ensureBrowser() {
    if (!this._browser) {
      this._browser = await puppeteer.launch(this._launchOptions);
    }
    return this._browser;
  }

  /**
   * Рендерит HTML-строку в PDF (A4, с фоном).
   * @param {string} html
   * @returns {Promise<Buffer>}
   */
  async htmlToPdf(html) {
    const browser = await this._ensureBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this._browser) {
      await this._browser.close();
      this._browser = null;
    }
  }
}

export function createPdfEngine(launchOptions) {
  return new PdfEngine(launchOptions);
}

export default createPdfEngine;
