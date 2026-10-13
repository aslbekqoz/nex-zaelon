// Jurnal: har bir qadam ekranga va run papkasidagi log.txt ga yoziladi.
import fs from 'node:fs';
import path from 'node:path';

let logFile = null;

export function setLogDir(dir) {
  logFile = path.join(dir, 'log.txt');
}

export function log(...parts) {
  const time = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' });
  const line = `[${time}] ${parts.join(' ')}`;
  console.log(line);
  if (logFile) fs.appendFileSync(logFile, line + '\n');
}
