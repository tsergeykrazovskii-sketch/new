# Звук ролика: озвучка по таймлайну + спокойная синтезированная подложка (пэд и мягкое арпеджио),
# подложка приглушается под голосом, итог — −16 LUFS. python3 audio.py grooming → out/mix-grooming.wav
import json, os, subprocess, sys
import numpy as np

SR = 48000

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

# D — Bm — G — A, по 4 секунды
CHORDS = [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]]
BAR = 4.0

def pad(T):
    n = int(T * SR); L = np.zeros(n); R = np.zeros(n)
    t_all = np.arange(int((BAR + 2.5) * SR)) / SR
    k = 0
    while k * BAR < T:
        ch = CHORDS[k % len(CHORDS)]
        a = int(k * BAR * SR); m = min(len(t_all), n - a)
        if m <= 0: break
        t = t_all[:m]
        env = np.minimum(1, t / 1.2) * np.where(t < BAR, 1.0, np.exp(-(t - BAR) / 0.8))
        for j, note in enumerate(ch):
            f = hz(note + 12 * (j == 0 and 0))
            for det, side in ((-0.12, 0), (0.0, 2), (0.12, 1)):
                ff = f * 2 ** (det / 12 / 4)
                w = sum(np.sin(2 * np.pi * ff * h * t + h * j) / h ** 1.8 for h in range(1, 7))
                g = 0.05 * env * w * (0.7 if j == 0 else 1.0)
                if side in (0, 2): L[a:a + m] += g
                if side in (1, 2): R[a:a + m] += g
        # бас — основной тон на октаву ниже
        b = 0.09 * env * np.sin(2 * np.pi * hz(ch[0] - 12) * t)
        L[a:a + m] += b; R[a:a + m] += b
        # арпеджио: ноты аккорда на две октавы выше, каждые полсекунды
        for s in range(int(BAR / 0.5)):
            st = a + int(s * 0.5 * SR); ln = min(int(1.4 * SR), n - st)
            if ln <= 0: continue
            tt = np.arange(ln) / SR
            note = ch[[1, 2, 3, 4, 3, 2, 3, 4][s % 8]] + 12
            p = 0.018 * np.exp(-tt / 0.45) * np.minimum(1, tt / 0.01) * (np.sin(2 * np.pi * hz(note) * tt) + 0.3 * np.sin(4 * np.pi * hz(note) * tt))
            pan = 0.35 if s % 2 else -0.35
            L[st:st + ln] += p * (1 - pan); R[st:st + ln] += p * (1 + pan)
        k += 1
    return L, R

def envelope(x, att=0.06, rel=0.45):
    win = int(0.03 * SR)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, mode='same'))
    e = np.minimum(1, rms / (rms.max() * 0.3 + 1e-9))
    # сглаживание: быстро вниз, медленно вверх (по блокам 10 мс)
    blk = int(0.01 * SR); nb = len(e) // blk + 1
    eb = np.array([e[i * blk:(i + 1) * blk].max() if i * blk < len(e) else 0 for i in range(nb)])
    out = np.zeros(nb); a_c = np.exp(-0.01 / att); r_c = np.exp(-0.01 / rel); v = 0
    for i, x_ in enumerate(eb):
        v = a_c * v + (1 - a_c) * x_ if x_ > v else r_c * v + (1 - r_c) * x_
        out[i] = v
    return np.repeat(out, blk)[:len(x)]

for N in sys.argv[1:]:
    TL = json.load(open(f'timeline-{N}.json'))
    T = TL['total']; n = int(T * SR)
    voice = np.zeros(n)
    for sc in TL['scenes']:
        v = load(sc['vo']); a = int(sc['start'] * SR)
        voice[a:a + len(v)] += v[:max(0, n - a)]
    L, R = pad(T)
    duck = 1 - 0.55 * envelope(voice)
    t = np.arange(n) / SR
    fade = np.minimum(1, t / 1.5) * np.minimum(1, np.maximum(0, (T - t) / 2.5))
    music = 0.22 * duck * fade
    mixL = voice + L * music; mixR = voice + R * music
    st = np.stack([mixL, mixR], 1)
    st /= max(1e-9, np.abs(st).max()) / 0.9
    os.makedirs('out', exist_ok=True)
    tmp = f'out/raw-{N}.f32'
    st.astype(np.float32).tofile(tmp)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', tmp,
                    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', str(SR), f'out/mix-{N}.wav'], check=True)
    os.remove(tmp)
    print(N, 'звук готов:', f'out/mix-{N}.wav', f'{T:.1f} с')
