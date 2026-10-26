// SVG → PNG (прозрачный фон) через Playwright: node brand/topin/src/png.mjs
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// как в scripts/share.mjs: PLAYWRIGHT=/путь/к/playwright/index.mjs, иначе глобальный playwright
const { chromium } = process.env.PLAYWRIGHT ? await import(pathToFileURL(process.env.PLAYWRIGHT).href) : createRequire(import.meta.url)('playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jobs = [];
for (const dir of ['logo', 'icon']) for (const f of readdirSync(join(root, dir))) {
  if (!f.endsWith('.svg')) continue;
  const name = basename(f, '.svg');
  if (dir === 'logo') jobs.push([`${dir}/${f}`, `png/${name}.png`, { width: 3000 }]);
  else if (name === 'favicon') for (const s of [16, 32, 48, 180, 192, 512]) jobs.push([`${dir}/${f}`, `png/favicon-${s}.png`, { width: s }]);
  else for (const s of [512, 1024]) jobs.push([`${dir}/${f}`, `png/${name}-${s}.png`, { width: s }]);
}
jobs.push(['topin-brandbook.svg', 'png/topin-brandbook-3072.png', { width: 3072, bg: true }]);

mkdirSync(join(root, 'png'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, { width, bg }] of jobs) {
  const svg = readFileSync(join(root, src), 'utf8');
  const [, , , w, h] = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/).map(Number);
  const height = Math.round(width * h / w);
  await page.setViewportSize({ width, height });
  await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:${width}px;height:${height}px}</style>
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`);
  await page.waitForFunction(() => document.images[0].complete);
  await page.screenshot({ path: join(root, out), omitBackground: !bg });
}
await browser.close();
console.log(jobs.length, 'png');
