#!/bin/bash
# Полная сборка ролика ниши: таймлайн → кадры (2 потока) → звук → mp4 в promo/.
# Нужны vo/<ниша>-0..6.wav (фразы script.json, тишина по краям обрезана, 48 кГц) и серверы: dist на :8791 (для capture), папка film на :8795.
# ./final.sh grooming
set -e
N=$1
cd "$(dirname "$0")"
for i in 0 1 2 3 4 5 6; do [ -f "vo/$N-$i.wav" ] || { echo "нет озвучки vo/$N-$i.wav"; exit 1; }; done
python3 timeline.py "$N"
TOTAL=$(python3 -c "import json,math; print(math.ceil(json.load(open('timeline-$N.json'))['total']*30))")
HALF=$((TOTAL / 2))
rm -f out/$N-*.mp4
node render.mjs "$N" full 0 "$HALF" > "render-$N-a.log" 2>&1 &
node render.mjs "$N" full "$HALF" > "render-$N-b.log" 2>&1 &
python3 audio.py "$N"
wait
printf "file '%s'\nfile '%s'\n" "out/$N-0.mp4" "out/$N-$HALF.mp4" > "out/list-$N.txt"
ffmpeg -v error -y -f concat -safe 0 -i "out/list-$N.txt" -i "out/mix-$N.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "../slot-promo-$N.mp4"
ffprobe -v error -show_entries format=duration -of csv=p=0 "../slot-promo-$N.mp4"
