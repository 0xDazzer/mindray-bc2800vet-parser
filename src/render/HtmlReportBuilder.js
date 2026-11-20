import {
  REPORT_LAYOUT,
  rangesForSpecies,
  displayUnit,
  formatRange,
} from './refRanges.js';

// Дизайн-токены бланка (см. design_handoff_oak_report).
const T = {
  accent: '#1F7A86',
  markerNormal: '#2E8C97',
  flag: '#D1495B',
  ink: '#15252A',
  sub: '#5C6B6F',
  muted: '#8B999D',
  label: '#7E8C90',
  cardBg: '#F5F8F8',
  pageBg: '#EDEBE4',
  lineHard: '#E4EAEB',
  lineSoft: '#F0F3F3',
  track: '#EEF2F2',
  band: '#D9EBEC',
  footer: '#9AA6A9',
};

const COLS = 'grid-template-columns:1fr 70px 54px 92px 170px; gap:0 12px;';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Builder бланка ОАК (GoF Builder): по шагам собирает HTML-секции и отдаёт
 * готовый документ через build(). Каждый шаг инкапсулирует разметку и стили
 * одной секции; шаги chainable. Порядком сборки управляет Director
 * (buildReportHtml ниже) — вызывающий код не знает о внутренней структуре.
 */
export class HtmlReportBuilder {
  constructor() {
    this.title = 'Отчёт об общем анализе крови';
    this.showBars = true;
    this._parts = [];
  }

  setTitle(title) {
    if (title) this.title = title;
    return this;
  }

  setShowBars(show) {
    this.showBars = show !== false;
    return this;
  }

  header(record) {
    this._parts.push(`
      <div style="display:flex; gap:16px; align-items:flex-start;">
        <div style="width:5px; align-self:stretch; background:${T.accent}; border-radius:3px;"></div>
        <div style="flex:1; display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
          <div>
            <div style="font-family:'Archivo',sans-serif; font-size:24px; font-weight:700; letter-spacing:-.4px; line-height:1.05;">${esc(this.title)}</div>
            <div style="font-size:11px; color:${T.sub}; margin-top:5px; letter-spacing:.2px;">Гематологическое исследование · автоматический анализатор</div>
          </div>
          <div style="flex:none; font-family:'IBM Plex Mono',monospace; font-size:9px; color:${T.accent}; text-align:right; line-height:1.6;">№ пробы<br><span style="font-size:15px; font-weight:600; color:${T.ink};">${esc(record.sample)}</span></div>
        </div>
      </div>`);
    return this;
  }

  patientCard(meta, record) {
    const cell = (label, value) => `
        <div><div style="color:${T.label}; font-size:9px; text-transform:uppercase; letter-spacing:.6px; margin-bottom:2px;">${esc(label)}</div><div style="font-weight:600;">${esc(value || '—')}</div></div>`;
    const analysisTime = [record.date, record.time].filter(Boolean).join(' ');
    this._parts.push(`
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:14px 22px; margin-top:22px; padding:16px 18px; background:${T.cardBg}; border-radius:8px; font-size:11.5px;">
        ${cell('Пациент', meta.patient)}
        ${cell('Вид · Пол', [meta.species, meta.sex].filter(Boolean).join(' · '))}
        ${cell('Возраст', meta.age)}
        ${cell('Клиент', meta.client)}
        ${cell('Врач', meta.doctor)}
        ${cell('Время анализа', analysisTime)}
      </div>`);
    return this;
  }

  tableHead() {
    this._parts.push(`
      <div style="display:grid; ${COLS} align-items:center; font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.6px; color:${T.label}; padding:0 10px 7px; margin-top:24px; border-bottom:1px solid ${T.lineHard};">
        <div>Показатель</div><div>Результат</div><div>Ед.</div><div>Интервал</div><div>Референс</div>
      </div>`);
    return this;
  }

  group(name, rows) {
    const header = `
      <div style="font-family:'Archivo',sans-serif; font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:${T.accent}; padding:15px 10px 7px;">${esc(name)}</div>`;
    this._parts.push(header + rows.map((r) => this._row(r)).join(''));
    return this;
  }

  // Приватный шаг: одна строка показателя + расчёт шкалы/флага.
  _row(r) {
    const flag = r.status === 'high' || r.status === 'low';
    const valueColor = flag ? T.flag : T.ink;
    const arrow = r.status === 'high' ? '↑' : r.status === 'low' ? '↓' : '';

    let bar = '';
    if (this.showBars && r.hasMarker) {
      const markerColor = flag ? T.flag : T.markerNormal;
      bar = `
            <div style="position:relative; height:12px;">
              <div style="position:absolute; top:50%; left:2px; right:2px; height:4px; transform:translateY(-50%); background:${T.track}; border-radius:3px;"></div>
              <div style="position:absolute; top:50%; left:20%; right:20%; height:4px; transform:translateY(-50%); background:${T.band}; border-radius:3px;"></div>
              <div style="position:absolute; top:50%; transform:translate(-50%,-50%) rotate(45deg); width:10px; height:10px; border-radius:2px; box-shadow:0 0 0 2px #fff; left:${r.leftPct}; background:${markerColor};"></div>
            </div>`;
    } else {
      bar = '<div></div>';
    }

    return `
          <div style="display:grid; ${COLS} align-items:center; min-height:31px; border-bottom:1px solid ${T.lineSoft}; padding:3px 10px; font-size:11.5px;">
            <div style="line-height:1.12;"><span style="font-weight:600;">${esc(r.code)}</span><div style="font-size:9px; color:${T.muted};">${esc(r.name)}</div></div>
            <div style="font-weight:700; display:flex; align-items:baseline; gap:3px; color:${valueColor};"><span>${esc(r.v)}</span><span style="font-size:11px;">${arrow}</span></div>
            <div style="color:${T.muted}; font-size:9.5px;">${esc(r.unit)}</div>
            <div style="color:${T.muted}; font-size:9.5px; font-variant-numeric:tabular-nums;">${esc(r.range)}</div>${bar}
          </div>`;
  }

  footer(meta) {
    const operator = meta.operator ? esc(meta.operator) : '—';
    const printedAt = esc(meta.printedAt || '');
    this._parts.push(`
      <div style="margin-top:20px; display:flex; justify-content:space-between; font-size:9px; color:${T.footer}; border-top:1px solid ${T.lineHard}; padding-top:11px;">
        <span>Этот результат применим только к данной пробе. · Оператор: ${operator}</span>
        <span>Печать: ${printedAt}</span>
      </div>`);
    return this;
  }

  build() {
    const body = this._parts.join('\n');
    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  @page { size: A4; margin: 10mm; }
  body { background: #fff; font-family: 'IBM Plex Sans', Arial, sans-serif; color: ${T.ink}; }
  [data-page] { padding: 34px 30px; }
</style>
</head>
<body>
  <div data-page>
${body}
  </div>
</body>
</html>`;
  }
}

/**
 * Director: ведёт Builder в нужном порядке и строит строки из разобранной
 * записи и референсов вида. Возвращает готовый HTML-бланк.
 *
 * @param {object} record  результат parseRecord
 * @param {object} [meta]   метаданные пациента/печати (инжектятся снаружи)
 * @param {object} [ranges] набор референсов; по умолчанию — по meta.species
 */
export function buildReportHtml(record, meta = {}, ranges = null) {
  const refs = ranges || rangesForSpecies(meta.species);
  const builder = new HtmlReportBuilder()
    .setTitle(meta.reportTitle)
    .setShowBars(meta.showBars)
    .header(record)
    .patientCard(meta, record)
    .tableHead();

  for (const grp of REPORT_LAYOUT) {
    const rows = grp.params.map(({ key, name }) =>
      buildRow(key, name, record.results[key], refs[key]));
    builder.group(grp.name, rows);
  }

  return builder.footer(meta).build();
}

/** Превращает один разобранный показатель в данные строки бланка. */
export function buildRow(code, name, result, range) {
  const value = result ? result.value : null;
  const unit = displayUnit(result ? result.unit : '');
  const rangeStr = formatRange(range);

  if (value == null) {
    return { code, name, v: '—', unit, range: rangeStr, status: 'normal', hasMarker: false, leftPct: '50%' };
  }

  const v = value.toFixed(result.decimals ?? 0);
  let status = 'normal';
  let leftPct = '50%';
  let hasMarker = false;

  if (range && range.length === 2) {
    const [min, max] = range;
    if (value < min) status = 'low';
    else if (value > max) status = 'high';

    let pos = 20 + ((value - min) / (max - min)) * 60;
    if (!Number.isFinite(pos)) pos = 50;
    leftPct = `${clamp(pos, 4, 96).toFixed(1)}%`;
    hasMarker = true;
  }

  return { code, name, v, unit, range: rangeStr, status, hasMarker, leftPct };
}

export default buildReportHtml;
