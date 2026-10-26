"""TOPIN — векторный логотип и брендбук. Всё в кривых, без внешних шрифтов."""
import os
from glyphs import glyph_path, bounds, text, fit_tracking, num

OUT = os.environ.get('OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
C = dict(yellow='#F6E300', black='#0B0B0B', gray='#6B6B6B', light='#F5F5F5', white='#FFFFFF')

# ---------- знак «N» (высота 700, ширина 731) ----------
# корпус: левая ножка + диагональ; треугольник в правой ножке; жёлтый клин между ними
N_BODY = 'M0,0H123L731,700H520L196,327V700H0Z'
N_TRI = 'M503,0H731V486Z'
N_WEDGE = 'M477,0H503L731,486V700L477,407Z'
N_W = 731

def shift(d, dx):
    """сдвиг простого контура из M/H/V/L по x"""
    import re
    out = []; 
    for cmd, args in re.findall(r'([MHVLZ])([^MHVLZ]*)', d):
        a = [float(v) for v in re.split(r'[ ,]+', args.strip()) if v]
        if cmd in 'ML': a = [a[0] + dx, a[1]]
        elif cmd == 'H': a = [a[0] + dx]
        out.append(cmd + ','.join(num(v) for v in a))
    return ''.join(out)

# ---------- словесный знак TOPIN (высота заглавной 700, базовая линия y=700) ----------
W8, SX = 800, 1.06          # Montserrat ExtraBold, расширение 6 % — по замерам оригинала
centers = {'T': 321, 'O': 1031, 'P': 1834, 'I': 2327}
N_X = 2507
left = min(c - (bounds('Montserrat', W8, ch)[2] - bounds('Montserrat', W8, ch)[0]) * SX / 2 for ch, c in centers.items())
letters = []
for ch, c in centers.items():
    b = bounds('Montserrat', W8, ch); w = (b[2] - b[0]) * SX
    letters.append(glyph_path('Montserrat', W8, ch, c - w / 2 - left, 700, sx=SX))
nx = N_X - left
WM_W = nx + N_W            # ширина словесного знака
WM_TOP, WM_BOT = -15, 715  # с выносами «O»
WM_LETTERS = ' '.join(letters)
WM_BODY = WM_LETTERS + ' ' + shift(N_BODY, nx)
WM_TRI = shift(N_TRI, nx)
WM_WEDGE = shift(N_WEDGE, nx)

def wordmark(fg, accent, tri=None, x=0, y=0, scale=1.0):
    """словесный знак; accent=None — клин вырезан (монохром)"""
    tri = tri or fg
    t = f' transform="translate({num(x)},{num(y)}) scale({num(scale)})"' if (x or y or scale != 1) else ''
    s = f'<g{t}><path fill="{fg}" d="{WM_BODY}"/>'
    s += f'<path fill="{tri}" d="{WM_TRI}"/>'
    if accent: s += f'<path fill="{accent}" d="{WM_WEDGE}"/>'
    return s + '</g>'

def mark(fg, accent, tri=None, x=0, y=0, scale=1.0):
    tri = tri or fg
    s = f'<g transform="translate({num(x)},{num(y)}) scale({num(scale)})"><path fill="{fg}" d="{N_BODY}"/><path fill="{tri}" d="{N_TRI}"/>'
    if accent: s += f'<path fill="{accent}" d="{N_WEDGE}"/>'
    return s + '</g>'

# слоган под знаком: по ширине знака, заглавные 115 (кегль 164), верх на 868
TAG = 'DIGITAL VISIBILITY AGENCY'
TAG_SIZE = 164
TAG_TR = fit_tracking(TAG, 'Montserrat', 500, TAG_SIZE, WM_W)
TAG_D, _ = text(TAG, 'Montserrat', 500, TAG_SIZE, 0, 868 + 115, TAG_TR)

def primary(fg, accent, tri=None):
    return wordmark(fg, accent, tri) + f'<path fill="{fg}" d="{TAG_D}"/>'
PRIMARY_BOX = (0, WM_TOP, WM_W, 983 - WM_TOP)

# горизонтальная компоновка: знак | три строки
H_DIV_X = WM_W + 200
H_TX = H_DIV_X + 20 + 240
H_SIZE = 150 / 0.7
H_LINES = ['DIGITAL', 'VISIBILITY', 'AGENCY']
H_TR = 0.16
h_paths = []; h_w = 0
for i, ln in enumerate(H_LINES):
    d, w = text(ln, 'Montserrat', 500, H_SIZE, H_TX, 25 + 150 + i * 250, H_TR); h_paths.append(d); h_w = max(h_w, w)
H_D = ' '.join(h_paths)
def horizontal(fg, accent, tri=None):
    return (wordmark(fg, accent, tri) + f'<rect fill="{fg}" x="{num(H_DIV_X)}" y="0" width="20" height="700"/>'
            + f'<path fill="{fg}" d="{H_D}"/>')
H_BOX = (0, WM_TOP, H_TX + h_w, WM_BOT - WM_TOP)

# ---------- иконка 512×512 ----------
ICON = 512; ICON_R = 104
def icon(bg, fg, accent, tri=None, x=0, y=0, size=ICON):
    k = size / ICON; nh = 256; ns = nh / 700; nw = N_W * ns
    return (f'<g transform="translate({num(x)},{num(y)}) scale({num(k)})"><rect width="{ICON}" height="{ICON}" rx="{ICON_R}" fill="{bg}"/>'
            + mark(fg, accent, tri, (ICON - nw) / 2, (ICON - nh) / 2, ns) + '</g>')

ICONS = {
    'yellow': dict(bg=C['yellow'], fg=C['black'], accent=None),
    'black':  dict(bg=C['black'], fg=C['white'], accent=C['yellow']),
    'light':  dict(bg=C['light'], fg=C['black'], accent=C['yellow']),
}

# ---------- запись файлов ----------
def svg(box, body, bg=None, title='TOPIN'):
    x, y, w, h = box
    r = f'<rect x="{num(x)}" y="{num(y)}" width="{num(w)}" height="{num(h)}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{num(x)} {num(y)} {num(w)} {num(h)}" '
            f'width="{num(w / 4)}" height="{num(h / 4)}"><title>{title}</title>{r}{body}</svg>\n')

def pad(box, p):
    x, y, w, h = box; return (x - p, y - p, w + 2 * p, h + 2 * p)

files = {}
def put(name, content): files[name] = content

WM_BOX = (0, WM_TOP, WM_W, WM_BOT - WM_TOP)
variants = {
    'color':        (C['black'], C['yellow'], None, None),
    'color-inverse':(C['white'], C['yellow'], None, C['black']),
    'mono-black':   (C['black'], None, None, None),
    'mono-white':   (C['white'], None, None, C['black']),
}
for v, (fg, ac, tri, prev) in variants.items():
    put(f'logo/topin-primary-{v}.svg', svg(PRIMARY_BOX, primary(fg, ac, tri), title='TOPIN — Digital Visibility Agency'))
    put(f'logo/topin-horizontal-{v}.svg', svg(H_BOX, horizontal(fg, ac, tri), title='TOPIN — Digital Visibility Agency'))
    put(f'logo/topin-compact-{v}.svg', svg(WM_BOX, wordmark(fg, ac, tri), title='TOPIN'))
for v, kw in ICONS.items():
    put(f'icon/topin-icon-{v}.svg', svg((0, 0, ICON, ICON), icon(**kw), title='TOPIN'))
put('icon/topin-mark-color.svg', svg((0, 0, N_W, 700), mark(C['black'], C['yellow']), title='TOPIN N'))
put('icon/topin-mark-color-inverse.svg', svg((0, 0, N_W, 700), mark(C['white'], C['yellow']), title='TOPIN N'))
put('icon/favicon.svg', svg((0, 0, ICON, ICON), icon(**ICONS['yellow']), title='TOPIN'))

if __name__ == '__main__':
    for n, c in files.items():
        p = os.path.join(OUT, n); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w').write(c)
    print(len(files), 'files; wordmark width', round(WM_W), 'tag tracking', round(TAG_TR, 3))
