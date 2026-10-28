"""Evaluate lilt_analysis on the synthetic fixtures and write EVALUATION.md.

    .venv/bin/python scripts/evaluate.py            # writes ../EVALUATION.md (analysis/EVALUATION.md)

Runs the real CLI path (decode -> 16-bit derived WAV -> Praat) on every fixture. Synthetic
fixtures have known truth; macOS TTS fixtures (synthetic speech, NOT natural speech) have no
truth and are only cross-checked against a second Praat algorithm.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import sys
import tempfile

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "tests"))

import av  # noqa: E402
import parselmouth  # noqa: E402

import make_fixtures as M  # noqa: E402
from scoring import contour_array, score  # noqa: E402

from lilt_analysis import analyze as A  # noqa: E402
from lilt_analysis.cli import main  # noqa: E402


def run(path: str, work: str, tag: str) -> dict:
    sha = hashlib.sha256(open(path, "rb").read()).hexdigest()
    out = os.path.join(work, f"{tag}.json")
    main(["--input", path, "--wav-out", os.path.join(work, f"{tag}.analysis.wav"), "--out", out,
          "--source-sha256", sha, "--run-id", tag])
    return json.load(open(out))


def fmt(v, spec="{:.3f}"):
    return "–" if v is None else spec.format(v)


def truth_median(fx) -> float | None:
    if "median" in fx.expect:
        return float(fx.expect["median"])
    return None


def synthetic_rows(work: str, wavdir: str, encoded: dict) -> list[dict]:
    rows = []
    by = {f.name: f for f in M.build_fixtures()}
    items = [(f"{n}.wav", os.path.join(wavdir, f"{n}.wav"), by[n]) for n in by]
    for key, p in encoded.items():
        base = key.split(".")[0].replace("_truncated", "")
        items.append((key, p, by[base]))
    for label, path, fx in items:
        doc = run(path, work, label.replace(".", "_"))
        m = doc["measures"]
        s = score(doc, fx.truth)
        tm = truth_median(fx)
        med = m["f0_median_hz"]["value"]
        rows.append({
            "fixture": label,
            "truth": tm,
            "median": med,
            "median_err_pct": (abs(med / tm - 1) * 100) if (tm and med) else None,
            "gross_rate_pct": None if s["gross_error_rate"] is None else s["gross_error_rate"] * 100,
            "scorable_v": s["n_scorable_voiced"],
            "v_miss": s["voiced_misses"],
            "scorable_uv": s["n_scorable_unvoiced"],
            "uv_fa": s["unvoiced_false_alarms"],
            "coverage": f'{m["voiced_frame_coverage"]["numerator"]}/{m["voiced_frame_coverage"]["denominator"]}',
            "jumps": len(doc["suspected_octave_jumps"]),
            "flags": ", ".join(f["code"] for f in doc["quality_flags"]) or "–",
            "abstained": med is None,
            "doc": doc,
            "fx": fx,
        })
    return rows


def tts_rows(work: str, ttsdir: str) -> list[dict]:
    rows = []
    for name, path in M.make_say(ttsdir).items():
        doc = run(path, work, name)
        f_ac = contour_array(doc)
        # Second algorithm on the identical derived samples: Praat cross-correlation, same range/step.
        import wave
        with wave.open(os.path.join(work, f"{name}.analysis.wav")) as w:
            sr = w.getframerate()
            x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768.0
        pc = parselmouth.Sound(x, sr).to_pitch_cc(time_step=A.TIME_STEP, pitch_floor=A.PITCH_FLOOR,
                                                  pitch_ceiling=A.PITCH_CEILING)
        f_cc = pc.selected_array["frequency"]
        # CC frames are centred on a different grid; match each AC frame to the nearest CC frame
        # within half a time step and compare only matched frames.
        t_ac = doc["contour"]["t0"] + A.TIME_STEP * np.arange(f_ac.size)
        j = np.rint((t_ac - pc.xs()[0]) / pc.dt).astype(int)
        ok = (j >= 0) & (j < f_cc.size)
        ok[ok] &= np.abs(pc.xs()[j[ok]] - t_ac[ok]) <= A.TIME_STEP / 2 + 1e-9
        a = f_ac[ok]
        c = f_cc[j[ok]]
        c = np.where(c > 0, c, np.nan)
        va, vc = np.isfinite(a), np.isfinite(c)
        both = va & vc
        cents = 1200 * np.abs(np.log2(a[both] / c[both]))
        rows.append({
            "fixture": f"{name}.aiff",
            "median": doc["measures"]["f0_median_hz"]["value"],
            "coverage": f'{doc["measures"]["voiced_frame_coverage"]["numerator"]}/'
                        f'{doc["measures"]["voiced_frame_coverage"]["denominator"]}',
            "voicing_agree_pct": 100 * float(np.mean(va == vc)),
            "both_voiced": int(both.sum()),
            "within20_pct": 100 * float(np.mean(cents < 1200 * np.log2(1.2))) if both.any() else None,
            "median_abs_cents": float(np.median(cents)) if both.any() else None,
            "jumps": len(doc["suspected_octave_jumps"]),
            "flags": ", ".join(f["code"] for f in doc["quality_flags"]) or "–",
        })
    return rows


def build_report(rows, trows, method) -> str:
    L = []
    L.append("# Lilt analysis helper: evaluation (synthetic fixtures only)\n")
    L.append("_Generated by `scripts/evaluate.py`; do not edit by hand. Re-run after any change to the "
             "algorithm, parameters, Praat/Parselmouth version or decoding._\n")
    L.append("## Status: descriptive only\n")
    L.append("**Natural-speech validation has NOT been done.** No natural-speech recordings with independently "
             "checked reference pitch contours were available. Every result below comes from synthetic signals "
             "(tones, noise, glides) or synthetic text-to-speech. These results show that the software behaves as "
             "specified on known signals; they do not show that pitch measurements are accurate on real voices, "
             "microphones or rooms. All measures are therefore `use_status: descriptive_only` and must not drive "
             "corrective feedback or progression.\n")
    L.append("## Versions and algorithm actually used\n")
    L.append(f"- Parselmouth {method['parselmouth_version']}, bundled Praat {method['praat_version']} "
             f"({method['praat_version_date']})")
    L.append(f"- PyAV {av.__version__} (bundled FFmpeg libavformat "
             f"{'.'.join(map(str, av.library_versions['libavformat']))}), NumPy {np.__version__}, "
             f"Python {platform.python_version()} on {platform.system()} {platform.machine()}")
    L.append(f"- Pitch algorithm used: **`{method['pitch_algorithm']}`** (`{method['params']['praat_command']}`)")
    L.append(f"- Selection: {method['pitch_algorithm_note']}")
    L.append("- Parameters (fixed for every take, no gender-based range): `" +
             json.dumps({k: v for k, v in method["params"].items() if k != "praat_command"}) + "`")
    L.append(f"- Octave-jump ratio {method['octave_jump_ratio']} (and 1/{method['octave_jump_ratio']}); "
             f"clip threshold |x| >= {method['clip_threshold']}; low signal < {method['low_signal_rms_dbfs']} dBFS RMS; "
             f"minimum voiced material {method['min_voiced_s']} s\n")
    if method["pitch_algorithm"] != "filtered_ac":
        L.append("Filtered autocorrelation (Praat >= 6.4, which Praat recommends for intonation) is **not** "
                 "available: the newest Parselmouth on PyPI bundles an older Praat. The code probes for it on "
                 "every start and will switch automatically (after a calibration self-check) if a newer "
                 "Parselmouth provides it; that path is untested here. Switching algorithms changes results, so "
                 "historical takes must then be reanalysed for matched comparisons.\n")

    L.append("## Synthetic fixtures with known truth\n")
    L.append("Definitions: frames are 10 ms. A frame is *scorable voiced* when the truth is voiced and steady "
             "(< 5 % change) across the whole 50 ms Praat window, *scorable unvoiced* when the truth is unvoiced "
             "across the window; boundary frames are excluded. *Gross error*: scorable voiced frame reported voiced "
             "but > 20 % from truth (rate over such frames). *V miss*: scorable voiced frame reported unvoiced. "
             "*UV false alarm*: scorable unvoiced frame reported voiced. *Coverage*: voiced frames / all analysed "
             "frames (the denominator the app sees). Median error is only defined for constant-pitch fixtures.\n")
    L.append("| Fixture | True F0 | Median F0 | Median err % | Gross err % | V miss / scorable V | UV false alarm / scorable UV | Coverage | Octave jumps | Flags |")
    L.append("|---|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        L.append(f"| {r['fixture']} | {fmt(r['truth'], '{:g}')} | {fmt(r['median'], '{:.2f}')} | "
                 f"{fmt(r['median_err_pct'], '{:.3f}')} | {fmt(r['gross_rate_pct'], '{:.2f}')} | "
                 f"{r['v_miss']}/{r['scorable_v']} | {r['uv_fa']}/{r['scorable_uv']} | {r['coverage']} | "
                 f"{r['jumps']} | {r['flags']} |")
    L.append("")
    L.append("Encoded files (`.webm` = Opus in WebM like Chrome/Firefox MediaRecorder; `.mp4` = AAC in fragmented MP4 "
             "like Safari) are PyAV encodes of the WAV fixtures; `_truncated` copies keep the first 60 % of the bytes.\n")

    L.append("### Abstention behaviour\n")
    for r in rows:
        if r["abstained"]:
            L.append(f"- `{r['fixture']}`: all F0 summaries null (`insufficient_voiced_material`), contour values "
                     f"{sum(v is not None for v in r['doc']['contour']['f0_hz'])}, flags: {r['flags']}")
    L.append("")

    short = next((r for r in rows if r["fixture"] == "octave_jump_short.wav"), None)
    L.append("## Known failures found by this evaluation\n")
    if short and (short["gross_rate_pct"] or 0) > 1:
        L.append(f"- **Short octave section tracked at the subharmonic.** In `octave_jump_short` (0.3 s at 400 Hz "
                 f"inside 200 Hz) raw AC reports ~200 Hz throughout: gross error "
                 f"rate {fmt(short['gross_rate_pct'], '{:.1f}')} %, {short['jumps']} suspected jumps, no flag. A "
                 "perfectly periodic synthetic tone is equally periodic at half its frequency, and the octave-jump "
                 "cost outweighs the octave cost over 30 frames. With 0.8 s at 400 Hz (`octave_jump`) both "
                 "jumps are tracked and reported. So *the absence of suspected octave jumps does not prove the "
                 "absence of octave errors.* This fixture is reported, not asserted.")
    elif short:
        L.append(f"- **Short octave section now tracked.** In `octave_jump_short` (0.3 s at 400 Hz inside 200 Hz) "
                 f"the gross error rate is {fmt(short['gross_rate_pct'], '{:.1f}')} % with {short['jumps']} suspected "
                 "jumps reported, since the AC octave cost was raised from Praat's 0.01 to 0.055 (with 0.01 it "
                 "stayed at ~200 Hz, 13.4 % gross errors). Subharmonics are still possible on other signals: "
                 "*the absence of suspected octave jumps does not prove the absence of octave errors.* This "
                 "fixture is reported, not asserted.")
    L.append("- The octave-jump detector flags any abrupt ratio > 1.8 between adjacent voiced frames. It cannot tell "
             "a tracking error from a genuine pitch break (both are in `octave_jump`); jumps are reported, never "
             "corrected.")
    mp4 = next((r for r in rows if r["fixture"] == "mixed_voiced_unvoiced.mp4"), None)
    if mp4:
        segs = mp4["doc"]["voiced_segments"]
        L.append(f"- **AAC/MP4 timing offset.** Voiced segments in `mixed_voiced_unvoiced.mp4` are {segs} vs truth "
                 "[[0.5, 1.0], [1.5, 2.2]]: shifted later by up to ~25 ms, and the decoded file is slightly longer than "
                 "the source. This is consistent with AAC encoder priming samples not being trimmed for this "
                 "fragmented MP4 (cause not verified). Timestamps from MP4 input should be treated as accurate to "
                 "about +/- 30 ms. Real Safari recordings were not tested.")
    L.append("- Truncation is detected from decoder evidence (demuxer 'File ended prematurely', corrupt packets, a "
             "decode error after valid frames, or a declared duration longer than what decoded). A file cut exactly "
             "on a block boundary with no declared duration (typical of MediaRecorder WebM) is indistinguishable from "
             "a complete short recording.")
    L.append("")

    L.append("## Synthetic speech (macOS `say`) — algorithm cross-check, not ground truth\n")
    if trows:
        L.append("These are text-to-speech outputs: lawful synthetic speech, **not natural speech**. There is no "
                 "reference contour. Because filtered autocorrelation is unavailable, the planned filtered-AC vs raw-AC "
                 "comparison could not be run; instead the pipeline's raw AC contour is compared with Praat's "
                 "cross-correlation method (`To Pitch (cc)`, same 60–700 Hz range and 10 ms step, Praat defaults "
                 "otherwise) on the identical derived samples. Agreement between two algorithms from the same toolkit "
                 "is a consistency check only; it is not validation.\n")
        L.append("| Fixture | AC median F0 | AC coverage | Voicing agreement % | Frames voiced in both | Within 20 % of each other | Median |AC−CC| (cents) | Octave jumps | Flags |")
        L.append("|---|---|---|---|---|---|---|---|---|")
        for r in trows:
            L.append(f"| {r['fixture']} | {fmt(r['median'], '{:.1f}')} | {r['coverage']} | "
                     f"{r['voicing_agree_pct']:.1f} | {r['both_voiced']} | {fmt(r['within20_pct'], '{:.1f}')} % | "
                     f"{fmt(r['median_abs_cents'], '{:.1f}')} | {r['jumps']} | {r['flags']} |")
    else:
        L.append("macOS `say` was not available; no synthetic-speech cross-check was run.")
    L.append("")

    L.append("## What is not evaluated\n")
    L.append("- Natural speech with independent reference contours (the evaluation asset that is missing). Until it "
             "exists, measurements stay descriptive only.")
    L.append("- Real browser recordings (Chrome/Firefox WebM, Safari MP4) from real microphones; only PyAV encodes "
             "were decoded.")
    L.append("- Noisy, reverberant or low-SNR voiced speech; breathy, creaky or very high voices; voices near the "
             "60 or 700 Hz limits.")
    L.append("- Any link between these measures and perceived femininity, resonance or lightness. None is claimed.")
    L.append("")
    return "\n".join(L)


def main_eval() -> int:
    method = A.method_block()
    with tempfile.TemporaryDirectory() as work:
        wavdir = os.path.join(work, "wav")
        os.makedirs(wavdir)
        for f in M.build_fixtures():
            M.write_wav16(os.path.join(wavdir, f"{f.name}.wav"), f.x, f.sr)
        encdir = os.path.join(work, "enc")
        os.makedirs(encdir)
        encoded = M.make_encoded(encdir)
        rows = synthetic_rows(work, wavdir, encoded)
        ttsdir = os.path.join(work, "tts")
        os.makedirs(ttsdir)
        trows = tts_rows(work, ttsdir)
    report = build_report(rows, trows, method)
    dest = os.path.join(ROOT, "EVALUATION.md")
    with open(dest, "w") as fh:
        fh.write(report)
    print(report)
    print(f"\nwrote {dest}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main_eval())
