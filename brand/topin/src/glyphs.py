# Контуры букв из Montserrat / Manrope (переменные шрифты Google, SIL OFL) → SVG path.
# Единицы шрифта: em = 1000 (Montserrat, высота заглавной 700) и 2000 (Manrope) — приводим к em = 1000.
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from functools import lru_cache
import glob, os
FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../assets/fonts/files/')
FAM = {'Montserrat': 'montserrat-{}-*.woff2', 'Manrope': 'manrope-{}-*.woff2'}

def num(v): return ('%.2f' % v).rstrip('0').rstrip('.')

@lru_cache(None)
def fonts(fam, w):
    out = []
    for sub in ('latin', 'cyrillic'):
        p = [x for x in glob.glob(FD + FAM[fam].format(sub)) if 'alternates' not in x and '-ext-' not in x][0]
        f = instantiateVariableFont(TTFont(p), {'wght': w})
        out.append((f, f.getGlyphSet(), f.getBestCmap(), 1000 / f['head'].unitsPerEm))
    return out

def g(fam, w, ch):
    for f, gs, cmap, k in fonts(fam, w):
        if ord(ch) in cmap: return gs[cmap[ord(ch)]], gs, k
    raise KeyError(ch)

def bounds(fam, w, ch):
    gl, gs, k = g(fam, w, ch); bp = BoundsPen(gs); gl.draw(bp)
    return tuple(v * k for v in bp.bounds) if bp.bounds else None

def glyph_path(fam, w, ch, x, baseline, size=1000, sx=1.0):
    """буква: левый край контура в x; size — кегль (em)"""
    gl, gs, k = g(fam, w, ch); x0 = bounds(fam, w, ch)[0]; s = size / 1000 * k
    pen = SVGPathPen(gs, ntos=num)
    gl.draw(TransformPen(pen, (s * sx, 0, 0, -s, x - x0 / k * s * sx, baseline)))
    return pen.getCommands()

def text(t, fam, w, size, x=0, baseline=0, tracking=0, anchor='start', trim=True):
    """строка в кривых; tracking — в долях em (0.3 = 300/1000). Возвращает (path, ширина по контурам)"""
    s = size / 1000; cx = 0; segs = []; left = right = None
    for ch in t:
        gl, gs, k = g(fam, w, ch)
        b = bounds(fam, w, ch)
        if b:
            segs.append((ch, cx, gl, gs, k))
            l, r = cx + b[0], cx + b[2]
            left = l if left is None else min(left, l); right = r if right is None else max(right, r)
        cx += gl.width * k + tracking * 1000
    if left is None: return '', 0
    ox = left if trim else 0
    width = (right - ox) * s
    if anchor == 'middle': x -= width / 2
    elif anchor == 'end': x -= width
    pen = SVGPathPen(None, ntos=num)
    for ch, c, gl, gs, k in segs:
        pen.glyphSet = gs
        gl.draw(TransformPen(pen, (s * k, 0, 0, -s * k, x + (c - ox) * s, baseline)))
    return pen.getCommands(), width

def fit_tracking(t, fam, w, size, width):
    """трекинг, при котором строка займёт ровно width"""
    _, w0 = text(t, fam, w, size); n = len(t) - 1
    return (width - w0) / (n * size)
