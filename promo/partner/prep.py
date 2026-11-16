import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import os, qrcode, qrcode.image.svg
from PIL import Image

os.makedirs('img', exist_ok=True)
os.makedirs('qr', exist_ok=True)

def jpg(src, dst, w, q=84):
    im = Image.open('shots/' + src).convert('RGB')
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save('img/' + dst, quality=q, optimize=True)

for n in ['auto', 'barber', 'nails', 'grooming', 'massage']:
    jpg(f'{n}-d-hero.png', f'{n}-d.jpg', 1600)
    jpg(f'{n}-widget.png', f'{n}-w.jpg', 700)
    jpg(f'{n}-m-hero.png', f'{n}-m.jpg', 700)
    jpg(f'{n}-m-book.png', f'{n}-b.jpg', 700)
for f in ['adm-d-bookings', 'adm-d-schedule', 'adm-d-services', 'adm-d-main']:
    jpg(f + '.png', f + '.jpg', 1800)
for f in ['adm-m-bookings', 'adm-m-services']:
    jpg(f + '.png', f + '.jpg', 700)

urls = {n: f'https://demo.top-in.ru/{n}/' for n in ['auto', 'barber', 'nails', 'grooming', 'massage']}
urls['home'] = 'https://demo.top-in.ru/'
urls['admin'] = 'https://demo.top-in.ru/nails/admin/'
for k, u in urls.items():
    q = qrcode.QRCode(border=0, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(u)
    q.make(fit=True)
    q.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(f'qr/{k}.svg')
print('ok')
