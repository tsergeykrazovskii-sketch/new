// Рендер ролика из film.html (сервер на :8795 в папке film).
//   node render.mjs <ниша> full [с кадра] [до кадра]  → out/<ниша>-<с кадра>.mp4 (30 к/с, без звука)
//   node render.mjs <ниша> probe t1 t2 …              → probe/<ниша>-<t>.jpg (проверочные кадры)
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT ? (await import('node:url')).pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');
process.chdir(new URL('.', import.meta.url).pathname);
const [N, mode, ...rest] = process.argv.slice(2);
const FPS = 30;
const br = await chromium.launch();
const p = await br.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.error('ERR', e.message));
p.on('console', (m) => m.type() !== 'log' && console.error(m.type(), m.text()));
await p.goto(`http://localhost:8795/film.html?n=${N}`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
const total = await p.evaluate(() => window.TOTAL);
const shot = async (t) => { await p.evaluate((t) => window.seek(t), t); return p.screenshot({ type: 'jpeg', quality: 92 }); };

if (mode === 'probe') {
  fs.mkdirSync('probe', { recursive: true });
  for (const t of rest.map(Number)) fs.writeFileSync(`probe/${N}-${t}.jpg`, await shot(t));
  console.log('probe', rest.length, 'кадров, ролик', total.toFixed(1), 'с');
} else {
  fs.mkdirSync('out', { recursive: true });
  const all = Math.ceil(total * FPS);
  const a = Number(rest[0] || 0), b = Math.min(all, Number(rest[1] || all));
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', `out/${N}-${a}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    const buf = await shot(f / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - a) % 300 === 0) console.log(`${N} ${f}/${b} ${((Date.now() - t0) / 1000).toFixed(0)} с`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`${N}: кадры ${a}–${b} готовы, out/${N}-${a}.mp4`);
}
await br.close();
