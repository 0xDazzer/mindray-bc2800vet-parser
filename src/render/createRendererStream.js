import { Writable } from 'node:stream';
import { buildReportHtml } from './HtmlReportBuilder.js';

function formatNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Writable-сток конвейера: принимает разобранный JSON-результат, превращает его
 * в HTML-бланк, рендерит в PDF и отправляет на печать.
 *
 * Паттерн «открытый конструктор» / Dependency Inversion: все сотрудники
 * (director сборки HTML, PDF-движок, принтер, метаданные пациента) инжектятся
 * снаружи, поэтому сток зависит от абстракций, а не от конкретных реализаций —
 * в тестах/оффлайне принтер легко заменить на запись в файл.
 *
 * @param {object} deps
 * @param {object} deps.pdfEngine  объект с htmlToPdf(html) → Promise<Buffer>
 * @param {object} deps.printer    объект с print(pdf, opts) → Promise<void>
 * @param {Function} [deps.buildHtml]  director (record, meta) → html
 * @param {object} [deps.meta]     метаданные пациента/печати по умолчанию
 */
export function createRendererStream({ pdfEngine, printer, buildHtml = buildReportHtml, meta = {} }) {
  return new Writable({
    objectMode: true,

    write(record, _enc, done) {
      (async () => {
        const fullMeta = { printedAt: formatNow(), ...meta };
        const html = buildHtml(record, fullMeta);
        const pdf = await pdfEngine.htmlToPdf(html);
        await printer.print(pdf, { title: `OAK-${record.sample}` });
      })().then(() => done(), done);
    },
  });
}

export default createRendererStream;
