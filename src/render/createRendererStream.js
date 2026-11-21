import { Writable } from 'node:stream';
import { buildReportHtml } from './HtmlReportBuilder.js';

/**
 * Writable-сток конвейера: принимает разобранный JSON-результат, превращает его
 * в HTML-бланк, рендерит в PDF (в памяти, на диск не пишется) и отправляет на печать.
 *
 * Паттерн «открытый конструктор» / Dependency Inversion: все сотрудники
 * (director сборки HTML, PDF-движок, принтер, метаданные бланка) инжектятся
 * снаружи, поэтому сток зависит от абстракций, а не от конкретных реализаций —
 * в тестах/оффлайне принтер легко заменить на запись в файл.
 *
 * @param {object} deps
 * @param {object} deps.pdfEngine  объект с htmlToPdf(html) → Promise<Buffer>
 * @param {object} deps.printer    объект с print(pdf, opts) → Promise<void>
 * @param {Function} [deps.buildHtml]  director (record, meta) → html
 * @param {object} [deps.meta]     метаданные бланка (вид, врач)
 * @param {(err:Error, record:object)=>void} [deps.onError]
 *        обработчик ошибки одной записи. Если задан — ошибка не роняет конвейер
 *        (живой анализатор продолжает слать пробы). Если не задан — ошибка
 *        уходит в поток.
 */
export function createRendererStream({
  pdfEngine, printer, buildHtml = buildReportHtml, meta = {}, onError,
}) {
  return new Writable({
    objectMode: true,

    write(record, _enc, done) {
      (async () => {
        const html = buildHtml(record, meta);
        const pdf = await pdfEngine.htmlToPdf(html);
        await printer.print(pdf, { title: `OAK-${record.sample}` });
      })().then(
        () => done(),
        (err) => {
          if (!onError) return done(err);
          onError(err, record);
          done();
        },
      );
    },
  });
}

export default createRendererStream;
