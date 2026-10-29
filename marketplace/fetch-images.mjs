// Фото товаров с Ozon → marketplace/img/products/<артикул>.webp (первое фото карточки)
// Нужен доступ к ir.ozone.ru / ir-*.ozone.ru и python3 с Pillow. Запуск: node marketplace/fetch-images.mjs
// Ozon не показывает свои фото на чужих сайтах, поэтому перед сдачей их нужно скачать в сайт.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(here, 'src/ozon-raw.json'), 'utf8'));
const out = path.join(here, 'img/products');
const tmp = fs.mkdtempSync(path.join(here, '.tmp-'));
fs.mkdirSync(out, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
let ok = 0;
for (const [id, r] of Object.entries(raw)) {
  const url = (r.images || [])[0];
  if (!url) continue;
  const src = path.join(tmp, id + path.extname(new URL(url).pathname));
  try {
    execFileSync('curl', ['-sSfL', '--retry', '3', '--retry-all-errors', '-m', '30', '-A', UA, '-e', 'https://www.ozon.ru/', '-o', src, url]);
    ok++;
  } catch (e) {
    console.log(`${id}: не скачалось (${url})`);
  }
}
if (ok) execFileSync('python3', [path.join(here, '..', 'scripts', 'images.py'), tmp, out], { stdio: 'inherit' });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Скачано ${ok} из ${Object.keys(raw).length}. Пересоберите: node marketplace/build.mjs`);
