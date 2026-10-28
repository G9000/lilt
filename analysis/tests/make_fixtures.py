"""Synthetic analysis fixtures with known ground truth.

Run `python tests/make_fixtures.py` to (re)write copies into tests/fixtures/. Tests and
scripts/evaluate.py regenerate the signals in memory from the same deterministic code
(fixed seeds), so the saved copies are for inspection and listening only.

Every fixture here is synthetic. The `say_*` fixtures are macOS text-to-speech output:
lawful synthetic speech, NOT natural human speech, and with no reference contour.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import wave
from dataclasses import dataclass, field

import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURE_DIR = os.path.join(HERE, "fixtures")


@dataclass
class Fixture:
    name: str
    x: np.ndarray
    sr: int
    # truth_f0(t) -> Hz for frames that should be voiced, or None when the frame should be unvoiced
    truth: object = None
    # expected voiced intervals [[s, e], ...] (None = no voicing expected)
    voiced_intervals: list | None = None
    expect: dict = field(default_factory=dict)
    description: str = ""


def _fade(x: np.ndarray, sr: int, ms: float = 10.0) -> np.ndarray:
    n = int(sr * ms / 1000)
    if n and x.size > 2 * n:
        w = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))
        x = x.copy()
        x[:n] *= w
        x[-n:] *= w[::-1]
    return x


def sine(f: float, dur: float = 2.0, amp: float = 0.5, sr: int = SR) -> np.ndarray:
    t = np.arange(int(dur * sr)) / sr
    return _fade(amp * np.sin(2 * np.pi * f * t), sr)


def harmonic_phase(phase: np.ndarray, n_harm: int = 10) -> np.ndarray:
    """Sawtooth-like: sum_k sin(k*phase)/k, normalised to peak 1."""
    y = sum(np.sin(k * phase) / k for k in range(1, n_harm + 1))
    return y / np.max(np.abs(y))


def harmonic(f: float, dur: float = 2.0, amp: float = 0.5, sr: int = SR, n_harm: int = 10) -> np.ndarray:
    t = np.arange(int(dur * sr)) / sr
    return _fade(amp * harmonic_phase(2 * np.pi * f * t, n_harm), sr)


def glide(f0: float, f1: float, dur: float = 2.0, amp: float = 0.5, sr: int = SR):
    """Exponential glide f0 -> f1 (harmonic complex, 10 harmonics, below 700 Hz ceiling fundamental)."""
    t = np.arange(int(dur * sr)) / sr
    k = np.log(f1 / f0) / dur
    inst = f0 * np.exp(k * t)
    phase = 2 * np.pi * np.cumsum(inst) / sr
    return _fade(amp * harmonic_phase(phase), sr), (lambda tt: f0 * np.exp(k * np.clip(tt, 0, dur)))


def noise(dur: float, rms_dbfs: float, seed: int, sr: int = SR) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.standard_normal(int(dur * sr)) * 10 ** (rms_dbfs / 20)


def build_fixtures() -> list[Fixture]:
    fx: list[Fixture] = []
    fx.append(Fixture("silence", np.zeros(2 * SR), SR, truth=None, voiced_intervals=[],
                      expect={"no_pitch": True, "flags": {"low_signal", "insufficient_voiced"}},
                      description="2 s digital silence"))
    fx.append(Fixture("low_noise", noise(2.0, -60, seed=1), SR, truth=None, voiced_intervals=[],
                      expect={"no_pitch": True, "flags": {"low_signal", "insufficient_voiced"}},
                      description="2 s Gaussian white noise at -60 dBFS RMS"))
    fx.append(Fixture("white_noise", noise(2.0, -12, seed=2), SR, truth=None, voiced_intervals=[],
                      expect={"no_pitch": True, "flags": {"insufficient_voiced"}},
                      description="2 s Gaussian white noise at -12 dBFS RMS"))
    for f in (110, 220, 330):
        fx.append(Fixture(f"sine_{f}", sine(f), SR, truth=(lambda t, f=f: np.full_like(t, f, dtype=float)),
                          voiced_intervals=[[0.0, 2.0]], expect={"median": f},
                          description=f"2 s pure sine {f} Hz, amplitude 0.5"))
    for f in (140, 240):
        fx.append(Fixture(f"harmonic_{f}", harmonic(f), SR, truth=(lambda t, f=f: np.full_like(t, f, dtype=float)),
                          voiced_intervals=[[0.0, 2.0]], expect={"median": f},
                          description=f"2 s harmonic complex {f} Hz, 10 harmonics with 1/k amplitudes"))
    g, gtruth = glide(150, 300)
    fx.append(Fixture("glide_150_300", g, SR, truth=gtruth, voiced_intervals=[[0.0, 2.0]],
                      expect={"glide": True}, description="2 s exponential glide 150 -> 300 Hz, harmonic complex"))

    t = np.arange(2 * SR) / SR
    clipped = np.clip(3.0 * np.sin(2 * np.pi * 200 * t), -1.0, 1.0)
    fx.append(Fixture("clipped_200", clipped, SR, truth=(lambda tt: np.full_like(tt, 200.0)),
                      voiced_intervals=[[0.0, 2.0]], expect={"median": 200, "flags": {"clipping"}},
                      description="2 s 200 Hz sine with gain 3, hard-clipped at full scale"))

    # mixed: silence | tone | noise | silence | tone | noise | silence
    parts, ivals, truth_spans = [], [], []
    cursor = 0.0

    def add(sig, voiced_f=None):
        nonlocal cursor
        d = sig.size / SR
        if voiced_f is not None:
            ivals.append([cursor, cursor + d])
            truth_spans.append((cursor, cursor + d, voiced_f))
        parts.append(sig)
        cursor += d

    add(np.zeros(int(0.5 * SR)))
    add(harmonic(200, 0.5, amp=0.4), 200.0)
    add(noise(0.3, -20, seed=3))
    add(np.zeros(int(0.2 * SR)))
    add(harmonic(180, 0.7, amp=0.4), 180.0)
    add(noise(0.3, -20, seed=4))
    add(np.zeros(int(0.5 * SR)))
    mixed = np.concatenate(parts)

    def mixed_truth(tt, spans=tuple(truth_spans)):
        out = np.full_like(tt, np.nan, dtype=float)
        for s, e, f in spans:
            out[(tt >= s) & (tt < e)] = f
        return out

    fx.append(Fixture("mixed_voiced_unvoiced", mixed, SR, truth=mixed_truth, voiced_intervals=ivals,
                      expect={"segments": ivals},
                      description="silence 0.5 | 200 Hz tone 0.5 | noise 0.3 | silence 0.2 | 180 Hz tone 0.7 | "
                                  "noise 0.3 | silence 0.5 (s)"))

    # deliberate octave jumps in the signal: 200 Hz -> 400 Hz -> 200 Hz, phase-continuous harmonic complex.
    # With Praat's default path costs, a perfectly periodic 400 Hz section is also perfectly periodic at
    # 200 Hz, so a SHORT section is tracked as its subharmonic (a real tracking error). The 0.8 s version
    # is the asserted fixture; the 0.3 s version is kept to report that failure honestly (not asserted).
    for name, a, b, expect in (("octave_jump", 0.6, 1.4, {"octave_jumps": True}),
                               ("octave_jump_short", 0.9, 1.2, {"report_only": True})):
        tt = np.arange(int(2.0 * SR)) / SR
        inst = np.where((tt >= a) & (tt < b), 400.0, 200.0)
        oj = _fade(0.5 * harmonic_phase(2 * np.pi * np.cumsum(inst) / SR), SR)
        fx.append(Fixture(name, oj, SR,
                          truth=(lambda t, a=a, b=b: np.where((t >= a) & (t < b), 400.0, 200.0)),
                          voiced_intervals=[[0.0, 2.0]], expect=expect,
                          description=f"harmonic complex 200 Hz with a {b - a:.1f} s section at 400 Hz "
                                      f"({a} - {b} s; real octave changes in the signal)"))
    return fx


# ---- vowels with known formants (resonance) ----------------------------------------------------
# Adult vowel formants (Hz) in the range of Peterson & Barney (1952). Above them, the resonances of a
# neutral 17.5 cm tract (every ~1000 Hz): a real tract has them all the way up, and without them the
# synthetic spectrum falls off far too steeply above F3.
VOWELS = {"i": (280, 2250, 2900), "a": (750, 1250, 2600), "u": (320, 870, 2250)}
HIGHER_FORMANTS = (3500, 4500, 5500, 6500)
BANDWIDTHS = (60, 90, 120, 150, 200, 250, 300)


def vowel(f0: float, formants, dur: float = 1.2, amp: float = 0.5, sr: int = SR) -> np.ndarray:
    """A steady synthetic vowel built in the frequency domain, independently of Praat: harmonics of f0
    up to 7 kHz, shaped by a glottal source (-12 dB/octave) and lip radiation (+6 dB/octave), then by
    Klatt-style second-order resonators at `formants` (seven, up to 6.5 kHz) with fixed bandwidths."""
    t = np.arange(int(dur * sr)) / sr
    fk = f0 * np.arange(1, int(7000 // f0) + 1)
    mag = (fk / 100) / (1 + (fk / 100) ** 2)
    w = 2 * np.pi * fk / sr
    for F, B in zip(formants, BANDWIDTHS):
        r, th = np.exp(-np.pi * B / sr), 2 * np.pi * F / sr
        den = np.abs(1 - 2 * r * np.cos(th) * np.exp(-1j * w) + r * r * np.exp(-2j * w))
        mag = mag * (1 - 2 * r * np.cos(th) + r * r) / den
    y = (mag[:, None] * np.sin(np.outer(fk, 2 * np.pi * t))).sum(axis=0)
    return _fade(amp * y / np.max(np.abs(y)), sr)


def build_vowels() -> list[Fixture]:
    """Each vowel at two pitches and two vocal-tract sizes: every formant 12 % higher in the second,
    as from a shorter tract (+1.96 semitones). Truth: the three formants given to the synthesiser."""
    fx = []
    for v, base in VOWELS.items():
        for f0 in (120, 220):
            for scale in (1.0, 1.12):
                F = [f * scale for f in base + HIGHER_FORMANTS]
                fx.append(Fixture(f"vowel_{v}_{f0}_{round(scale * 100)}", vowel(f0, F), SR,
                                  truth=(lambda t, f0=f0: np.full_like(t, f0, dtype=float)),
                                  voiced_intervals=[[0.0, 1.2]],
                                  expect={"median": f0, "formants": F[:3], "vowel": v, "scale": scale},
                                  description=f"1.2 s synthetic /{v}/ at {f0} Hz, formants {', '.join(f'{f:.0f}' for f in F)} Hz"))
    return fx


def write_wav16(path: str, x: np.ndarray, sr: int) -> None:
    pcm = np.round(np.clip(x, -1.0, 32767 / 32768) * 32768).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def encode(x: np.ndarray, sr: int, path: str, kind: str) -> None:
    """Encode with PyAV: kind 'webm' (opus, like Chrome/Firefox MediaRecorder) or 'mp4' (AAC,
    fragmented like Safari MediaRecorder)."""
    import av

    if kind == "webm":
        out = av.open(path, "w", format="webm")
        st = out.add_stream("libopus", rate=48000)
    else:
        out = av.open(path, "w", format="mp4",
                      options={"movflags": "frag_keyframe+empty_moov+default_base_moof", "frag_duration": "200000"})
        st = out.add_stream("aac", rate=sr)
    st.layout = "mono"
    frame = av.AudioFrame.from_ndarray(x.astype(np.float32)[None, :], format="flt", layout="mono")
    frame.sample_rate = sr
    rs = av.AudioResampler(format=st.codec_context.format.name, layout="mono", rate=st.codec_context.sample_rate,
                           frame_size=st.codec_context.frame_size or None)
    for f in rs.resample(frame) + rs.resample(None):
        for p in st.encode(f):
            out.mux(p)
    for p in st.encode(None):
        out.mux(p)
    out.close()


def truncate_copy(src: str, dst: str, keep_fraction: float) -> None:
    with open(src, "rb") as f:
        data = f.read()
    with open(dst, "wb") as f:
        f.write(data[: int(len(data) * keep_fraction)])


def make_encoded(outdir: str) -> dict[str, str]:
    """harmonic_240 and mixed as webm/opus and mp4/aac, plus truncated copies. Returns name->path."""
    by = {f.name: f for f in build_fixtures()}
    paths = {}
    for name in ("harmonic_240", "mixed_voiced_unvoiced"):
        for kind in ("webm", "mp4"):
            p = os.path.join(outdir, f"{name}.{kind}")
            encode(by[name].x, SR, p, kind)
            paths[f"{name}.{kind}"] = p
    for kind in ("webm", "mp4"):
        src = paths[f"harmonic_240.{kind}"]
        dst = os.path.join(outdir, f"harmonic_240_truncated.{kind}")
        truncate_copy(src, dst, 0.6)
        paths[f"harmonic_240_truncated.{kind}"] = dst
    return paths


SAY_TEXTS = {
    "say_samantha": ("Samantha", "The rainbow is a division of white light into many beautiful colors."),
    "say_daniel": ("Daniel", "When the sunlight strikes raindrops in the air, they act as a prism."),
    "say_karen": ("Karen", "Please call Stella and ask her to bring these things with her from the store."),
}


def make_say(outdir: str) -> dict[str, str]:
    """macOS TTS fixtures (synthetic speech; NOT natural speech). Empty if `say` is unavailable."""
    if not shutil.which("say"):
        return {}
    paths = {}
    for name, (voice, text) in SAY_TEXTS.items():
        p = os.path.join(outdir, f"{name}.aiff")
        r = subprocess.run(["say", "-v", voice, "-o", p, text], capture_output=True)
        if r.returncode == 0 and os.path.exists(p) and os.path.getsize(p) > 1000:
            paths[name] = p
    return paths


def main() -> int:
    os.makedirs(FIXTURE_DIR, exist_ok=True)
    for f in build_fixtures() + build_vowels():
        write_wav16(os.path.join(FIXTURE_DIR, f"{f.name}.wav"), f.x, f.sr)
    enc = make_encoded(FIXTURE_DIR)
    say = make_say(FIXTURE_DIR)
    with open(os.path.join(FIXTURE_DIR, "README.txt"), "w") as fh:
        fh.write(
            "All files here are generated by tests/make_fixtures.py and are synthetic.\n"
            "say_*.aiff are macOS text-to-speech output (synthetic speech, NOT natural speech; no reference\n"
            "contour exists). *.webm / *.mp4 are PyAV encodes of the wav fixtures; *_truncated.* are byte-cut\n"
            "copies (first 60 % of the file) to simulate an interrupted upload.\n\n"
        )
        for f in build_fixtures() + build_vowels():
            fh.write(f"{f.name}.wav: {f.description}\n")
    print(f"wrote {len(build_fixtures()) + len(build_vowels())} wav, {len(enc)} encoded, {len(say)} TTS fixtures to {FIXTURE_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
