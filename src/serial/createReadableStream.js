import { SerialPort } from 'serialport';

/**
 * Открывает последовательный порт анализатора и возвращает его как Readable-поток
 * сырых байт. Настройки соответствуют протоколу BC-2800Vet (9600 7-O-1).
 *
 * Паттерн «открытый конструктор»: вся конфигурация порта передаётся аргументом,
 * значения по умолчанию покрывают штатное подключение (DEVICE из окружения).
 *
 * @param {object} [options]  опции конструктора SerialPort (path, baudRate, …)
 * @returns {import('serialport').SerialPort}  Node Readable поток
 */
export function createReadableStream(options = {}) {
  return new SerialPort({
    path: process.env.DEVICE || '/dev/ttyUSB0',
    baudRate: 9600,
    dataBits: 7,
    parity: 'odd',
    stopBits: 1,
    autoOpen: true,
    ...options,
  });
}

export default createReadableStream;
