import puppeteer from 'puppeteer';

/**
 * Движок преобразования HTML → PDF на headless Chrome (Puppeteer).
 *
 * Жизненный цикл браузера управляется явно (ленивый запуск + close()), один
 * инстанс переиспользуется для всех бланков, чтобы не платить за перезапуск
 * Chromium на каждую запись (GRASP: контроль ресурса в одном месте).
 *
 * Если связь с Chromium оборвалась (процесс упал, CDP-сокет закрылся —
 * «Protocol error: Connection closed»), браузер сбрасывается и при следующем
 * рендере запускается заново; текущий рендер повторяется один раз.
 */
export class PdfEngine {
  constructor(launchOptions = {}) {
    this._launchOptions = { args: ['--no-sandbox'], ...launchOptions };
    this._browser = null;
    this._launching = null;
  }

  async _ensureBrowser() {
    if (this._browser && this._browser.connected) return this._browser;
    if (this._browser) await this._discardBrowser();
    if (!this._launching) {
      this._launching = puppeteer
        .launch(this._launchOptions)
        .then((browser) => {
          browser.once('disconnected', () => {
            if (this._browser === browser) this._browser = null;
          });
          this._browser = browser;
          return browser;
        })
        .finally(() => {
          this._launching = null;
        });
    }
    return this._launching;
  }

  /** Сбрасывает текущий браузер и добивает его процесс, если он ещё жив. */
  async _discardBrowser() {
    const browser = this._browser;
    this._browser = null;
    if (!browser) return;
    try {
      await browser.close();
    } catch {
      // соединения уже нет — убиваем процесс напрямую
    }
    try {
      browser.process()?.kill('SIGKILL');
    } catch {
      // процесс уже завершён
    }
  }

  async _render(html) {
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
      await page.close().catch(() => {});
    }
  }

  /**
   * Рендерит HTML-строку в PDF (A4, с фоном).
   * @param {string} html
   * @returns {Promise<Buffer>}
   */
  async htmlToPdf(html) {
    try {
      return await this._render(html);
    } catch (err) {
      // Одна повторная попытка на свежем браузере.
      console.error(`PDF: ошибка Chromium (${err.message}), перезапускаю браузер`);
      await this._discardBrowser();
      return this._render(html);
    }
  }

  async close() {
    await this._discardBrowser();
  }
}

export function createPdfEngine(launchOptions) {
  return new PdfEngine(launchOptions);
}

export default createPdfEngine;
