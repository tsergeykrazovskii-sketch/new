# контактный лист: python3 sheet.py out.jpg file1 file2 ... (высота строки 520)
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
H = 520
ims = []
for f in files:
    im = Image.open(f).convert('RGB'); ims.append((f, im.resize((int(im.width * H / im.height), H))))
W = 1900; rows = []; row = []; w = 0
for f, im in ims:
    if row and w + im.width > W: rows.append(row); row = []; w = 0
    row.append((f, im)); w += im.width + 10
rows.append(row)
sheet = Image.new('RGB', (W, len(rows) * (H + 30)), 'gray')
d = ImageDraw.Draw(sheet)
for r, row in enumerate(rows):
    x = 0
    for f, im in row:
        sheet.paste(im, (x, r * (H + 30) + 26)); d.text((x + 4, r * (H + 30) + 6), f.split('/')[-1], fill='white'); x += im.width + 10
sheet.save(out, quality=72)
