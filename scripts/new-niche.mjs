// Заготовка новой ниши из ближайшей готовой: node scripts/new-niche.mjs <id> --from <ниша>
//   node scripts/new-niche.mjs grooming --from nails
// Копирует niches/<ниша>.js в niches/<id>.js и меняет идентификатор. Всё остальное (названия, стили, услуги,
// мастера, тексты, фото) переписывается руками по скиллу .claude/skills/slot-niche. Фото пока остаются от исходной
// ниши (/assets/img/<ниша>/…), чтобы сайт собирался; новые кадры — в assets/img/<id>/ и замена путей.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--from');
const from = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : 'nails';

if (!id || !/^[a-z][a-z0-9-]{1,30}$/.test(id)) {
  console.error('Укажите id ниши латиницей: node scripts/new-niche.mjs grooming --from nails');
  process.exit(1);
}
const src = path.join(root, 'niches', from + '.js');
const dst = path.join(root, 'niches', id + '.js');
if (!fs.existsSync(src)) {
  console.error(`Нет ниши ${from}: есть ${fs.readdirSync(path.join(root, 'niches')).map((f) => f.replace(/\.js$/, '')).join(', ')}`);
  process.exit(1);
}
if (fs.existsSync(dst)) {
  console.error(`niches/${id}.js уже есть — не перезаписываю`);
  process.exit(1);
}

let s = fs.readFileSync(src, 'utf8');
s = s.replace(`Slot.niches.${from} =`, `Slot.niches[${JSON.stringify(id)}] =`).replace(`id: '${from}',`, `id: '${id}',`);
s =
  `/* Ниша «${id}» — заготовка из «${from}» (node scripts/new-niche.mjs). ПЕРЕПИСАТЬ: label, group, product, schemaType,\n` +
  ` * staffRole, стили, brand, promo, контакты, hero (и widget), services, staff, staffPortraits, booking, sections, legal.\n` +
  ` * Фото пока от «${from}»: новые кадры — assets/img/${id}/, затем заменить пути. Все имена, цены и отзывы — вымышленные. */\n` +
  s.replace(/^\/\*.*?\*\/\n/s, '');
fs.writeFileSync(dst, s);
fs.mkdirSync(path.join(root, 'assets', 'img', id), { recursive: true });
console.log(`Готово: niches/${id}.js (из ${from}), папка для фото assets/img/${id}/.\nДальше — по .claude/skills/slot-niche/SKILL.md, проверка: node scripts/build.mjs && node scripts/smoke.mjs`);
