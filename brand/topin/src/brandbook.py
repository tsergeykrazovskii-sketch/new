"""Брендбук TOPIN целиком (лист 1536×1024, как в исходнике) — в кривых."""
import os
from build import *
from glyphs import text, num

W, H = 1536, 1024
LINE = '#DADAD6'; INK = '#3A3A3A'; SUB = C['gray']
parts = [f'<rect width="{W}" height="{H}" fill="{C["light"]}"/>']

def T(s, x, base, size, w=400, fill=SUB, tr=0, anchor='start', fam='Manrope'):
    d, wd = text(s, fam, w, size, x, base, tr, anchor)
    parts.append(f'<path fill="{fill}" d="{d}"/>'); return wd

def head(title, sub, x, y):
    T(title, x, y + 10, 12.5, 500, INK, 0.14)
    T(sub, x, y + 28, 12.5, 400, SUB, 0.01)

def hl(x1, x2, y): parts.append(f'<rect x="{x1}" y="{y}" width="{x2 - x1}" height="1" fill="{LINE}"/>')
def vl(x, y1, y2): parts.append(f'<rect x="{x}" y="{y1}" width="1" height="{y2 - y1}" fill="{LINE}"/>')

def wm(x, y, width, fg=C['black'], ac=C['yellow'], tri=None):
    k = width / WM_W; parts.append(wordmark(fg, ac, tri, x, y, k)); return k * 700   # высота заглавной

# сетка
vl(853, 40, 395); hl(880, 1490, 211); vl(1236, 225, 392)
hl(47, 1490, 412); vl(853, 430, 676); vl(1236, 430, 676)
hl(47, 1490, 690); vl(570, 708, 932); vl(975, 708, 932)
hl(47, 1490, 948)

# основная версия
head('PRIMARY LOGO', 'Основная версия', 48, 42)
k = 604 / WM_W
parts.append(f'<g transform="translate(113,126) scale({num(k)})">{primary(C["black"], C["yellow"])}</g>')

# горизонтальная
head('HORIZONTAL LOCKUP', 'Горизонтальная компоновка', 884, 42)
k = (1446 - 940) / H_BOX[2]
parts.append(f'<g transform="translate(940,107) scale({num(k)})">{horizontal(C["black"], C["yellow"])}</g>')

# компактная
head('COMPACT LOGO', 'Компактная версия', 884, 232)
wm(916, 311, 259)

# иконка
head('ICON / FAVICON', 'Иконка', 1267, 232)
parts.append(icon(**ICONS['yellow'], x=1324, y=283, size=99))

# цветовые версии
head('COLOR VARIANTS', 'Цветовые версии', 48, 435)
boxes = [(48, 'light', 'На светлом фоне', '(основная)'), (321, 'dark', 'На тёмном фоне', '(инверсия)'),
         (594, 'mono', 'Монохромная версия', '(для особых случаев)')]
for x, kind, a, b in boxes:
    bw, bh = (245 if kind == 'mono' else 253), 126
    if kind == 'dark':
        parts.append(f'<rect x="{x}" y="490" width="{bw}" height="{bh}" fill="{C["black"]}"/>')
        wm(x + (bw - 197) / 2, 534, 197, C['white'], C['yellow'])
    else:
        parts.append(f'<rect x="{x + .5}" y="490.5" width="{bw - 1}" height="{bh - 1}" fill="none" stroke="{LINE}"/>')
        wm(x + (bw - 197) / 2, 534, 197, C['black'], C['yellow'] if kind == 'light' else None)
    T(a, x, 644, 12.5, 400, SUB); T(b, x, 662, 12.5, 400, SUB)

# охранное поле: x = высота заглавной
head('ОХРАННОЕ ПОЛЕ', 'Минимальное свободное пространство', 885, 435)
ww = 231; cap = ww / WM_W * 700; x0, y0 = 932, 546
L, R, Tp, B = x0 - cap, x0 + ww + cap, y0 - cap, y0 + cap * 2
dash = f'fill="none" stroke="#B9B9B4" stroke-dasharray="3 3"'
parts.append(f'<rect x="{num(L)}" y="{num(Tp)}" width="{num(R - L)}" height="{num(B - Tp)}" {dash}/>')
for xx in (x0, x0 + ww): parts.append(f'<line x1="{num(xx)}" y1="{num(Tp)}" x2="{num(xx)}" y2="{num(B)}" {dash}/>')
for yy in (y0, y0 + cap): parts.append(f'<line x1="{num(L)}" y1="{num(yy)}" x2="{num(R)}" y2="{num(yy)}" {dash}/>')
wm(x0, y0, ww)
for (cx, cy) in [(x0 + ww / 2, Tp + cap / 2), (x0 + ww / 2, y0 + cap * 1.5), (L + cap / 2, y0 + cap / 2), (R - cap / 2, y0 + cap / 2)]:
    T('x', cx, cy + 4, 13, 400, INK, anchor='middle')

# минимальный размер
head('МИНИМАЛЬНЫЙ РАЗМЕР', 'Для цифровых носителей', 1267, 435)
wm(1316, 552, 120)
parts.append(f'<rect x="1316" y="598" width="120" height="1" fill="{INK}"/>'
             f'<rect x="1316" y="594" width="1" height="9" fill="{INK}"/><rect x="1435" y="594" width="1" height="9" fill="{INK}"/>')
T('120 px', 1376, 618, 12.5, 400, SUB, anchor='middle')

# цвета
head('ФИРМЕННЫЕ ЦВЕТА', 'Палитра бренда', 48, 711)
pal = [(C['yellow'], '#F6E300', 'Жёлтый', '(акцентный)'), (C['black'], '#0B0B0B', 'Чёрный', '(основной)'),
       (C['gray'], '#6B6B6B', 'Серый', '(вторичный)'), ('#E9E9E6', '#F5F5F5', 'Светлый', '(фон)')]
for i, (fill, hexv, a, b) in enumerate(pal):
    cx = 90 + i * 124
    parts.append(f'<circle cx="{cx}" cy="805" r="42.5" fill="{fill}"/>')
    T(hexv, 48 + i * 124, 875, 12.5, 700, INK, 0.12)
    T(a, 48 + i * 124, 895, 12.5, 400, SUB); T(b, 48 + i * 124, 913, 12.5, 400, SUB)

# типографика
head('ТИПОГРАФИКА', 'Шрифты', 617, 711)
T('Aa', 624, 834, 92, 800, C['black'])
T('Manrope', 777, 804, 13.5, 600, INK); T('(заголовки / акценты)', 777, 822, 12.5, 400, SUB)
T('Aa', 624, 911, 62, 600, '#2A2A2A')
T('Manrope', 733, 888, 13.5, 400, INK); T('(основной текст)', 733, 906, 12.5, 400, SUB)

# иконки
head('ИКОНКИ / ПРИЛОЖЕНИЯ', 'Варианты использования', 1005, 711)
for i, (v, lbl) in enumerate([('yellow', 'Иконка / Жёлтая'), ('black', 'Иконка / Чёрная'), ('light', 'Иконка / Светлая')]):
    x = 1030 + i * 166
    kw = dict(ICONS[v]); kw['bg'] = '#E6E6E3' if v == 'light' else kw['bg']
    parts.append(icon(**kw, x=x, y=769, size=101))
    T(lbl, x + 50.5, 903, 12, 400, SUB, anchor='middle')

# подвал
wm(48, 969, 62)
T('DIGITAL VISIBILITY AGENCY', 769, 981, 11.5, 500, INK, 0.22, anchor='middle')
T('SEO   /   GEO   /   WEB   /   AI', 1490, 981, 11.5, 500, INK, 0.12, anchor='end')

open(os.path.join(OUT, 'topin-brandbook.svg'), 'w').write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><title>TOPIN — брендбук</title>{"".join(parts)}</svg>\n')
print('ok')
