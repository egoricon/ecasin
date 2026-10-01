"""Synthesises the mod's original sounds (filtered noise, no samples) and encodes them to OGG.

Run from the vapemod/ folder:  python3 tools/gen_sounds.py
Requires numpy and ffmpeg with libvorbis.
"""
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "src/main/resources/assets/vapemod/sounds"
rng = np.random.default_rng(26_2)


def lowpass(x, cutoff):
    # simple one-pole low-pass, cutoff may be an array (time-varying)
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2.0 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def envelope(n, attack, release, curve=1.0):
    t = np.arange(n) / SR
    dur = n / SR
    env = np.minimum(1.0, t / max(attack, 1e-4)) * np.minimum(1.0, (dur - t) / max(release, 1e-4))
    return np.clip(env, 0, 1) ** curve


def normalise(x, peak):
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def write_ogg(name, x):
    OUT.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        with wave.open(tmp.name, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name,
                        "-c:a", "libvorbis", "-q:a", "3", str(OUT / f"{name}.ogg")], check=True)
    print("wrote", OUT / f"{name}.ogg")


def inhale():
    # 3 s: soft airflow rising in brightness plus a faint coil sizzle
    n = int(SR * 3.0)
    t = np.arange(n) / SR
    air = lowpass(rng.standard_normal(n), 500 + 900 * (t / t[-1]))
    air = highpass(air, 150)
    sizzle = highpass(rng.standard_normal(n), 4000) * (rng.random(n) < 0.02) * 0.6
    sizzle = lowpass(sizzle, 7000)
    x = air * envelope(n, 0.35, 0.15) * (0.6 + 0.4 * t / t[-1]) + sizzle * envelope(n, 0.6, 0.2)
    return normalise(x, 0.55)


def exhale():
    # 1.6 s: breathy "hhhaaa" with falling brightness
    n = int(SR * 1.6)
    t = np.arange(n) / SR
    x = lowpass(rng.standard_normal(n), 1600 * np.exp(-t * 1.2) + 300)
    x = highpass(x, 120)
    x *= envelope(n, 0.05, 1.2, curve=1.4)
    return normalise(x, 0.8)


def cough():
    # three short throaty bursts
    out = np.zeros(int(SR * 1.0))
    for start, dur, gain, f in [(0.0, 0.16, 1.0, 900), (0.26, 0.13, 0.8, 800), (0.5, 0.18, 0.9, 700)]:
        n = int(SR * dur)
        t = np.arange(n) / SR
        burst = lowpass(rng.standard_normal(n), f)
        burst += 0.35 * np.sin(2 * np.pi * (180 - 60 * t / dur) * t) * np.sign(rng.standard_normal(n)) * 0.3
        burst = highpass(burst, 90) * envelope(n, 0.008, dur * 0.8, curve=1.6) * gain
        i = int(SR * start)
        out[i:i + n] += burst
    return normalise(out, 0.85)


write_ogg("vape_inhale", inhale())
write_ogg("vape_exhale", exhale())
write_ogg("cough", cough())
