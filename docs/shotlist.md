# Список кадров для генерации

Кадры для демо-ниш «Слот Барбер» и «Слот Авто». Генерируются один раз и используются во всех демо ниши, пока у клиента нет своих фото.

Для реального клиента нейросетевые фото используем только как атмосферу (руки, инструменты, детали). Зал, команду и работы показываем на его настоящих фото, иначе демо будет вводить в заблуждение.

Общее для всех кадров: без текста, логотипов и вывесок; лица не в фокусе или вне кадра (кроме портретов вымышленных мастеров); естественный свет, плёночное зерно, сдержанная цветокоррекция, чтобы кадры подходили ко всем стилям ниши.

Файлы кладём в `assets/img/<ниша>/` через `python3 scripts/images.py <исходники> assets/img/<ниша>`.

## Сделано 15.10.2026

Все 20 фото сгенерированы в Higgsfield: GPT Image 2.5, качество medium, 2K, по 1 кредиту — 20 кредитов, без переделок. Видео для первого экрана не делали (решение пользователя), первый экран у обеих ниш на фото `hero`.

- Барбершоп: `hero`, `staff-1…4` (Артём, Тимур, Илья, Денис — в порядке мастеров ниши), в галерее `g-fade`, `g-beard`, `g-styling`, `g-family`, `g-interior`, `g-tools`.
- Автосервис: `hero`, в галерее `g-lift`, `g-diag`, `g-tires`, `g-reception`, `g-lounge`, `g-storage`.
- Запас: `barber/g-coffee`, `auto/g-brakes` — плитка галереи рассчитана на 6 фото. Это кадры атмосферы, их можно ставить и реальному клиенту.

## Барбершоп

Общая часть промпта: `editorial photograph, modern barbershop, warm wood, dark green and brass accents, soft natural window light, shallow depth of field, 35mm film grain, muted premium color grading, no text, no logos, no signage`

| Файл | Формат | Что в кадре | Промпт (добавить к общей части) |
|---|---|---|---|
| `hero` | 16:9 | Первый экран: барбер делает фейд машинкой | `close-up of a barber's hands fading a client's hair with a cordless clipper, client seen from behind, hair particles in the light, subject centered` |
| `hero` (видео) | 16:9, 5 с | То же, в движении | из кадра `hero`: `slow push-in, clipper moves along the fade, tiny hair particles drift in the light, calm` |
| `g-interior` | 3:2 | Зал без людей | `empty barbershop interior, black leather barber chairs, round mirrors, warm wall lamps, plants` |
| `g-fade` | 4:5 | Готовый скин-фейд | `back of a man's head with a fresh skin fade and textured top, crisp line` |
| `g-beard` | 4:5 | Борода и опасная бритва | `barber shaping a beard line with a straight razor, hot towel on the shoulder, face out of focus` |
| `g-tools` | 1:1 | Инструменты | `flat lay of barber tools on oak: scissors, comb, straight razor, shaving brush, clipper` |
| `g-coffee` | 4:5 | Кофе для гостя | `cup of black coffee on a barber station counter, bokeh of the shop behind` |
| `g-family` | 3:2 | Отец и сын | `father and young son sitting in neighbouring barber chairs, seen from behind and side, cheerful mood` |
| `g-styling` | 4:5 | Укладка | `barber's hands working matte pomade into textured short hair` |
| `staff-1…4` | 4:5 | Портреты вымышленных мастеров для демо «Ремесло» | `waist-up portrait of a confident male barber, 25–40 years old, black apron, arms crossed, barbershop background softly blurred` (4 разных человека) |

## Автосервис

Общая часть промпта: `editorial photograph, clean modern car service workshop, concrete floor, graphite walls, safety-yellow accents on lifts, cool daylight mixed with LED strips, 35mm film grain, no text, no logos, no license plates`

| Файл | Формат | Что в кадре | Промпт (добавить к общей части) |
|---|---|---|---|
| `hero` | 16:9 | Первый экран: машина на подъёмнике, мастер | `mechanic in a dark work uniform inspecting the underside of a car raised on a two-post lift, subject centered` |
| `hero` (видео) | 16:9, 5 с | То же, в движении | из кадра `hero`: `slow lateral dolly along the raised car, mechanic shines a flashlight, calm` |
| `g-reception` | 3:2 | Приёмка | `service reception desk with a tablet, key tags on a board, customer area` |
| `g-lift` | 3:2 | Подъёмники | `wide shot of three service bays with cars on lifts, tidy tool carts` |
| `g-diag` | 4:5 | Диагностика | `laptop with diagnostic graphs connected to a car OBD port, mechanic's hand` |
| `g-tires` | 4:5 | Шиномонтаж | `tire changer machine mounting a winter tire on an alloy wheel, close-up` |
| `g-storage` | 3:2 | Хранение шин | `neat racks of stored tires in bags with tags` |
| `g-brakes` | 4:5 | Тормоза | `close-up of a new brake disc and red caliper on a lifted car` |
| `g-lounge` | 3:2 | Комната ожидания | `customer lounge with a coffee machine, sofa and a window into the workshop` |
- 16.10.2026: `auto/staff-1…4` — портреты вымышленных механиков (4 кредита). В шаблоне автосервиса изначально нет мастеров; портреты — заглушки для мастеров без своего фото, в админке с пометкой «замените до запуска».
