// Фото упаковок с Ozon → zhar/img/products/<артикул>.webp (первое фото карточки, 900 px)
// Нужен доступ к ir.ozone.ru / ir-*.ozone.ru и python3 с Pillow. Запуск: node zhar/fetch-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(here, 'src/ozon-raw.json'), 'utf8'));
const out = path.join(here, 'img/products');
const tmp = fs.mkdtempSync(path.join(here, '.tmp-'));
fs.mkdirSync(out, { recursive: true });
let ok = 0;
for (const [id, r] of Object.entries(raw)) {
  const url = (r.images || [])[0];
  if (!url) continue;
  const src = path.join(tmp, id + path.extname(new URL(url).pathname));
  try {
    execFileSync('curl', ['-sSf', '--retry', '3', '-m', '30', '-o', src, url]);
    ok++;
  } catch (e) {
    console.log(`${id}: не скачалось (${url})`);
  }
}
if (ok) execFileSync('python3', [path.join(here, '..', 'scripts', 'images.py'), tmp, out], { stdio: 'inherit' });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Скачано ${ok} из ${Object.keys(raw).length}. Пересоберите: node zhar/build.mjs`);
