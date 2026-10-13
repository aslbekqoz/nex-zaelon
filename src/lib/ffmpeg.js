import { spawn } from 'node:child_process';

// ffmpeg / ffprobe ni ishga tushirish
export function run(cmd, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => reject(new Error(`${cmd} topilmadi yoki ishga tushmadi: ${e.message}`)));
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} xato (${code}): ${err.slice(-600)}`))));
  });
}

export const ffmpeg = (args, opts) => run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], opts);

export async function duration(file) {
  const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(out.trim());
}
