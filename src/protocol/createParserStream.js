import { Transform } from 'node:stream';
import { parseRecord } from './parseRecord.js';

// Маркеры кадра на проводе.
const START = 0x41;                              // 'A' — идентификатор тела пробы
const isTerminator = (b) => b <= 0x1f || b === 0x7f; // STX/EOF/ETX/CR/LF/…

/**
 * Transform-поток, который разбивает сырой байтовый поток с анализатора на
 * отдельные кадры и парсит каждый кадр в JSON.
 *
 * Паттерн «открытый конструктор» (Strategy + Dependency Inversion): стратегия
 * парсинга КОНКРЕТНОГО анализа передаётся снаружи через опцию `parse`, поэтому
 * поток отвечает только за фрейминг/разбиение, а не за формат данных.
 *
 * Вход  — Buffer (objectMode:false).
 * Выход — разобранный объект записи (objectMode:true).
 *
 * @param {{ parse?: (frameText:string)=>object }} [options]
 */
export function createParserStream({ parse = parseRecord } = {}) {
  let buffer = Buffer.alloc(0);

  // Выделяет все целые кадры из накопленного буфера, остаток оставляет на потом.
  function* drainFrames() {
    while (true) {
      const start = buffer.indexOf(START);
      if (start === -1) {
        buffer = Buffer.alloc(0); // мусор без начала кадра — отбрасываем
        return;
      }
      if (start > 0) buffer = buffer.subarray(start);

      let term = -1;
      for (let i = 1; i < buffer.length; i++) {
        if (isTerminator(buffer[i])) { term = i; break; }
      }
      if (term === -1) return; // кадр ещё не дошёл целиком — ждём следующий chunk

      const frameText = buffer.subarray(0, term).toString('ascii');
      buffer = buffer.subarray(term + 1);
      yield frameText;
    }
  }

  return new Transform({
    readableObjectMode: true,

    transform(chunk, _enc, done) {
      buffer = Buffer.concat([buffer, chunk]);
      for (const frameText of drainFrames()) {
        try {
          this.push(parse(frameText));
        } catch (err) {
          // Один битый кадр не должен ронять живой конвейер: сообщаем о нём
          // событием и продолжаем читать следующие кадры.
          this.emit('recordError', err, frameText);
        }
      }
      done();
    },
  });
}

export default createParserStream;
