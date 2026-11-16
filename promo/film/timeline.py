# Таймлайн ролика: сцены идут по фразам озвучки. python3 timeline.py grooming massage
# Длительность сцены — длина фразы vo/<ниша>-<i>.wav; если озвучки ещё нет — оценка по числу знаков
# (для черновика картинки). Пишет timeline-<ниша>.json: { scenes: [{ start, dur, text, vo }], total }.
import json, os, subprocess, sys

LEAD, GAP, TAIL = 0.7, 0.85, 2.2   # пауза до первой фразы, между сценами, после последней
CPS = 12.5                          # знаков в секунду — для оценки без озвучки

def dur(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)

S = json.load(open('script.json'))
for n in sys.argv[1:]:
    t, scenes, est = LEAD, [], False
    for i, text in enumerate(S[n]):
        vo = f'vo/{n}-{i}.wav'
        if os.path.exists(vo):
            d = dur(vo)
        else:
            d, est = len(text) / CPS, True
        scenes.append({'start': round(t, 3), 'dur': round(d, 3), 'text': text, 'vo': vo})
        t += d + GAP
    total = round(t - GAP + TAIL, 3)
    json.dump({'scenes': scenes, 'total': total}, open(f'timeline-{n}.json', 'w'), ensure_ascii=False, indent=1)
    print(f'{n}: {total:.1f} с' + (' (оценка без озвучки)' if est else ''))
