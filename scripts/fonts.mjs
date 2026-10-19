// Шрифты в комплекте сайта: скачиваем с Google Fonts один раз и кладём в assets/fonts.
// Сайт клиента потом не обращается к серверам Google — быстрее и без передачи IP посетителей за рубеж.
// Запуск: node scripts/fonts.mjs (нужен, только если в нишах или «Своей» теме появился новый шрифт).
//   assets/fonts/<семейство>.css — @font-face с путями files/…woff2
//   assets/fonts/files/*.woff2   — сами файлы (кириллица и латиница)
// Шрифты Google Fonts распространяются по лицензиям SIL OFL / Apache 2.0 — их можно класть в комплект сайта.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const out = path.join(root, 'assets', 'fonts');
const SUBSETS = new Set(['cyrillic', 'cyrillic-ext', 'latin', 'latin-ext']);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Все шрифты проекта: стили ниш, стили клиентов, «Своя» тема и админка
const ctx = vm.createContext({});
vm.runInContext(read('assets/js/render.js'), ctx);
for (const f of fs.readdirSync(path.join(root, 'niches'))) if (f.endsWith('.js')) vm.runInContext(read('niches/' + f), ctx);
const Slot = ctx.Slot;
const fam = new Map();
const add = (name, weights) => fam.set(name, new Set([...(fam.get(name) || []), ...weights]));
const specs = [];
Object.values(Slot.niches).forEach((n) => (n.styles || []).forEach((s) => specs.push(s.fonts)));
for (const f of fs.readdirSync(path.join(root, 'clients'))) if (f.endsWith('.json')) specs.push(...(read('clients/' + f).match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/g) || []));
specs.push(...(read('scripts/build.mjs').match(/https:\/\/fonts\.googleapis\.com\/css2\?[^'"`\s]+/g) || []));
for (const spec of specs.filter(Boolean)) {
  for (const m of String(spec).matchAll(/family=([^&]+)/g)) {
    const [n, axis] = decodeURIComponent(m[1]).replace(/\+/g, ' ').split(':');
    add(n, axis && axis.startsWith('wght@') ? axis.slice(5).split(';').map(Number) : [400]);
  }
}
[...Slot.FONTS.display, ...Slot.FONTS.body].forEach((f) => add(f.name, f.w));

fs.mkdirSync(path.join(out, 'files'), { recursive: true });
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
let files = 0;
let bytes = 0;
for (const [name, ws] of [...fam].sort()) {
  const weights = [...ws].sort((a, b) => a - b);
  const q = name.replace(/ /g, '+') + (weights.length === 1 && weights[0] === 400 ? '' : ':wght@' + weights.join(';'));
  const res = await fetch(`https://fonts.googleapis.com/css2?family=${q}&display=swap`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${name}: Google Fonts ответил ${res.status}`);
  const css = await res.text();
  const blocks = [];
  for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    const [, subset, body] = m;
    if (!SUBSETS.has(subset)) continue;
    const url = /url\((https:[^)]+\.woff2)\)/.exec(body)[1];
    const file = `${slug(name)}-${subset}-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 8)}.woff2`;
    const dest = path.join(out, 'files', file);
    if (!fs.existsSync(dest)) {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(`${name}: файл шрифта ${r.status}`);
      fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    }
    files++;
    bytes += fs.statSync(dest).size;
    blocks.push(`/* ${subset} */\n@font-face {${body.replace(/url\([^)]+\)/, `url(files/${file})`)}}`);
  }
  if (!blocks.length) throw new Error(`${name}: не нашлось кириллицы и латиницы`);
  fs.writeFileSync(path.join(out, slug(name) + '.css'), `/* ${name} — Google Fonts, лицензия SIL OFL / Apache 2.0 */\n${blocks.join('\n')}\n`);
  console.log(`${name}: ${weights.join(', ')} — ${blocks.length} блоков`);
}
console.log(`Готово: ${fam.size} семейств, ${files} подключений, ${(bytes / 1024 / 1024).toFixed(1)} МБ (с повторами)`);
