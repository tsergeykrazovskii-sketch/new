// Только для выкладки на GitHub Pages (репозиторий публичный, пароля у Pages нет):
//   dist/index.html            → редирект на основной сайт, чтобы заказчик, стёрший хвост ссылки, не видел витрину;
//   dist/<PRIVATE_PATH>/       → витрина для владельца: шаблоны ниш и все демо клиентов с админками.
// PRIVATE_PATH хранится в секретах репозитория (Settings → Secrets → Actions), в коде его нет.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const secret = (process.env.PRIVATE_PATH || '').replace(/[^a-z0-9-]/gi, '');
const home = process.env.HOME_URL || 'https://top-in.ru';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

fs.writeFileSync(
  path.join(dist, 'index.html'),
  `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow">
<meta http-equiv="refresh" content="0; url=${esc(home)}"><title>top-in.ru</title>
<script>location.replace(${JSON.stringify(home)})</script></head><body><a href="${esc(home)}">${esc(home)}</a></body></html>\n`
);

if (!secret) {
  console.log('PRIVATE_PATH не задан — витрина не собрана, корень — редирект');
  process.exit(0);
}

const clients = fs
  .readdirSync(path.join(root, 'clients'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(root, 'clients', f), 'utf8')))
  .filter((d) => fs.existsSync(path.join(dist, d.slug, 'index.html')));
const NICHE = { auto: 'Автосервисы', barber: 'Барбершопы', nails: 'Маникюрные студии' };
const row = (name, place, slug) =>
  `<li><span class="n">${esc(name)}</span><span class="p">${esc(place)}</span><a href="../${esc(slug)}/">сайт</a><a href="../${esc(slug)}/admin/">админка</a></li>`;
const groups = Object.entries(NICHE)
  .map(([id, title]) => {
    const list = clients
      .filter((d) => d.niche === id && d.slug !== 'tor')
      .sort((a, b) => a.brand.name.localeCompare(b.brand.name, 'ru'))
      .map((d) => row(d.brand.name, [d.contacts.city, d.contacts.metro].filter(Boolean).join(', '), d.slug));
    return list.length ? `<h2>${title} · ${list.length}</h2><ul>${list.join('')}</ul>` : '';
  })
  .join('');

fs.mkdirSync(path.join(dist, secret), { recursive: true });
fs.writeFileSync(
  path.join(dist, secret, 'index.html'),
  `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Слот — витрина</title>
<style>body{font:15px/1.45 system-ui,sans-serif;margin:0 auto;max-width:880px;padding:20px 16px;color:#1d1d1f;background:#fff}
h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:28px 0 8px}p{color:#666;margin:0 0 16px}ul{list-style:none;padding:0;margin:0}
li{display:flex;gap:12px;align-items:baseline;padding:7px 0;border-bottom:1px solid #eee;flex-wrap:wrap}.n{font-weight:600;flex:1 1 200px}.p{color:#777;flex:1 1 200px}
a{color:#0a66c2;text-decoration:none}a:hover{text-decoration:underline}</style></head><body>
<h1>Слот — витрина</h1><p>Только для владельца: адрес нигде не публикуется. Демо клиентов открыты по своим ссылкам.</p>
<h2>Шаблоны</h2><ul>${row('Техцентр «Поршень»', 'шаблон автосервиса', 'auto')}${row('Барбершоп «Ремесло»', 'шаблон барбершопа', 'barber')}${row('Студия маникюра «Миндаль»', 'шаблон маникюрной студии', 'nails')}</ul>
${groups}</body></html>\n`
);
console.log(`витрина: /${secret}/ — демо: ${clients.length}`);
