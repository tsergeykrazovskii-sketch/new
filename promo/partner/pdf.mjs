// deck.html → slot-partner.pdf и превью слайдов (prev/NN.jpg)
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT ? (await import('node:url')).pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');
const dir = new URL('.', import.meta.url).pathname;
const br = await chromium.launch();
const p = await br.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
p.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
p.on('requestfailed', (r) => console.log('failed:', r.url()));
await p.goto('file://' + dir + 'deck.html', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
// проверка: ничего не вылезает за слайд
const over = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('.s').forEach((s, i) => {
    const r = s.getBoundingClientRect();
    s.querySelectorAll('h2,h3,p,li,.chips,.qr,.big,.facts,.note,.sol,.plans,.roles,.flow,.feat,.probs').forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.bottom > r.bottom - 80 && !el.closest('.foot')) out.push(`${i + 1}: ${el.className || el.tagName} bottom=${Math.round(b.bottom - r.top)}`);
    });
  });
  return out;
});
console.log(over.length ? over.join('\n') : 'layout ok');
fs.mkdirSync(dir + 'prev', { recursive: true });
const n = await p.$$eval('.s', (s) => s.length);
for (let i = 0; i < n; i++) {
  const el = (await p.$$('.s'))[i];
  await el.screenshot({ path: `${dir}prev/${String(i + 1).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 70 });
}
await p.pdf({ path: dir + '../slot-partner.pdf', width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
console.log('slides', n, 'pdf', (fs.statSync(dir + '../slot-partner.pdf').size / 1048576).toFixed(1), 'MB');
await br.close();
