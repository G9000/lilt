"""Descriptive pitch and level measures using Praat (via Parselmouth).

Nothing here corrects, smooths or interpolates the pitch track. Unvoiced frames stay null,
suspected octave jumps are reported but left in place, and unavailable values are null with
a reason instead of zero.
"""

from __future__ import annotations

import math
from functools import lru_cache

import numpy as np
import parselmouth
from parselmouth.praat import call

# ---------------------------------------------------------------------------
# Fixed configuration (identical for every take; never derived from a gender label or target)
# ---------------------------------------------------------------------------
TIME_STEP = 0.01
PITCH_FLOOR = 60.0
PITCH_CEILING = 700.0

# Praat "To Pitch (ac)" settings: Praat's documented defaults except floor/ceiling/time step and
# octave cost. With the 60 Hz floor, the default octave cost (0.01) let raw autocorrelation settle on
# subharmonics: a real voice at 190 Hz with slightly uneven cycles was tracked at 95 and 63 Hz, so the
# median halved. 0.055 is the octave cost Praat documents for its newer filtered tracker below; it
# keeps that voice at 190 Hz and still follows genuine period doubling (strongly uneven cycles).
AC_PARAMS = {
    "praat_command": "To Pitch (ac)",
    "time_step": TIME_STEP,
    "pitch_floor": PITCH_FLOOR,
    "max_number_of_candidates": 15,
    "very_accurate": False,
    "silence_threshold": 0.03,
    "voicing_threshold": 0.45,
    "octave_cost": 0.055,
    "octave_jump_cost": 0.35,
    "voiced_unvoiced_cost": 0.14,
    "pitch_ceiling": PITCH_CEILING,
}

# Praat >= 6.4 "To Pitch (filtered autocorrelation)" settings, in the documented argument order:
# Time step, Pitch floor, Pitch top, Max. number of candidates, Very accurate, Attenuation at top,
# Silence threshold, Voicing threshold, Octave cost, Octave-jump cost, Voiced/unvoiced cost.
# Values are Praat's documented defaults except floor/top/time step. This path is only taken when
# the bundled Praat offers the command AND passes the calibration self-check below.
FILTERED_AC_PARAMS = {
    "praat_command": "To Pitch (filtered autocorrelation)",
    "time_step": TIME_STEP,
    "pitch_floor": PITCH_FLOOR,
    "pitch_top": PITCH_CEILING,
    "max_number_of_candidates": 15,
    "very_accurate": False,
    "attenuation_at_top": 0.03,
    "silence_threshold": 0.09,
    "voicing_threshold": 0.50,
    "octave_cost": 0.055,
    "octave_jump_cost": 0.35,
    "voiced_unvoiced_cost": 0.14,
}
_FILTERED_AC_ORDER = (
    "time_step", "pitch_floor", "pitch_top", "max_number_of_candidates", "very_accurate",
    "attenuation_at_top", "silence_threshold", "voicing_threshold", "octave_cost",
    "octave_jump_cost", "voiced_unvoiced_cost",
)

OCTAVE_JUMP_RATIO = 1.8  # adjacent voiced frames with ratio > 1.8 or < 1/1.8 (0.556)
TRACKING_ERROR_FRACTION = 0.02  # flag if suspected jumps exceed 2 % of voiced frames
CLIP_THRESHOLD = 0.999  # |x| >= threshold counts as clipped
CLIP_FLAG_FRACTION = 0.001  # flag "clipping" above this clipped-sample fraction
CLIP_BLOCK_FRACTION = 0.01  # ... and block voice feedback above this fraction
CLIP_REGION_MERGE_GAP_S = 0.05
LOW_SIGNAL_RMS_DBFS = -50.0
MIN_VOICED_S = 0.5
SEGMENT_MERGE_GAP_S = 0.05
SEGMENT_MIN_S = 0.05


def _call_filtered_ac(sound: parselmouth.Sound) -> parselmouth.Pitch:
    p = FILTERED_AC_PARAMS
    args = [("yes" if p[k] else "no") if k == "very_accurate" else p[k] for k in _FILTERED_AC_ORDER]
    return call(sound, p["praat_command"], *args)


def _call_ac(sound: parselmouth.Sound) -> parselmouth.Pitch:
    p = AC_PARAMS
    return sound.to_pitch_ac(
        time_step=p["time_step"],
        pitch_floor=p["pitch_floor"],
        max_number_of_candidates=p["max_number_of_candidates"],
        very_accurate=p["very_accurate"],
        silence_threshold=p["silence_threshold"],
        voicing_threshold=p["voicing_threshold"],
        octave_cost=p["octave_cost"],
        octave_jump_cost=p["octave_jump_cost"],
        voiced_unvoiced_cost=p["voiced_unvoiced_cost"],
        pitch_ceiling=p["pitch_ceiling"],
    )


def _self_check(fn) -> tuple[bool, str]:
    """Run the pitch call on a 1 s, 220 Hz harmonic calibration tone and check that it reports
    ~220 Hz with a 700 Hz ceiling. Guards against a wrong argument order."""
    sr = 16000
    t = np.arange(sr) / sr
    x = sum(np.sin(2 * np.pi * 220 * k * t) / k for k in range(1, 6)) * 0.3
    try:
        pitch = fn(parselmouth.Sound(x, sr))
    except Exception as exc:  # command missing or wrong arguments
        return False, f"{type(exc).__name__}: {str(exc).splitlines()[0][:200]}"
    f = pitch.selected_array["frequency"]
    f = f[f > 0]
    if f.size < 50:
        return False, f"calibration tone mostly unvoiced ({f.size} voiced frames)"
    med = float(np.median(f))
    ceiling = float(pitch.ceiling)
    if abs(med / 220.0 - 1) > 0.01 or abs(ceiling - PITCH_CEILING) > 1e-6 or abs(pitch.dt - TIME_STEP) > 1e-9:
        return False, f"calibration mismatch: median {med:.2f} Hz, ceiling {ceiling}, dt {pitch.dt}"
    return True, f"220 Hz calibration tone -> median {med:.3f} Hz, ceiling {ceiling:g} Hz"


@lru_cache(maxsize=1)
def select_pitch_algorithm() -> dict:
    ok, detail = _self_check(_call_filtered_ac)
    if ok:
        return {"pitch_algorithm": "filtered_ac", "params": dict(FILTERED_AC_PARAMS),
                "fn": _call_filtered_ac, "selection_note": f"filtered autocorrelation available; self-check: {detail}",
                "filtered_ac_probe": "available"}
    ok_ac, detail_ac = _self_check(_call_ac)
    if not ok_ac:
        raise RuntimeError(f"raw autocorrelation failed its calibration self-check: {detail_ac}")
    return {"pitch_algorithm": "ac", "params": dict(AC_PARAMS), "fn": _call_ac,
            "selection_note": (f"'To Pitch (filtered autocorrelation)' not usable in bundled Praat "
                               f"{parselmouth.PRAAT_VERSION} ({detail}); using raw autocorrelation. "
                               f"Self-check: {detail_ac}"),
            "filtered_ac_probe": detail}


def method_block() -> dict:
    algo = select_pitch_algorithm()
    return {
        "name": "lilt-analysis",
        "version": "1",
        "method_version": "lilt-analysis/2",
        "praat_version": parselmouth.PRAAT_VERSION,
        "praat_version_date": parselmouth.PRAAT_VERSION_DATE,
        "parselmouth_version": parselmouth.__version__,
        "pitch_algorithm": algo["pitch_algorithm"],
        "pitch_algorithm_note": algo["selection_note"],
        "params": algo["params"],
        "octave_jump_ratio": OCTAVE_JUMP_RATIO,
        "tracking_error_fraction": TRACKING_ERROR_FRACTION,
        "clip_threshold": CLIP_THRESHOLD,
        "clip_flag_fraction": CLIP_FLAG_FRACTION,
        "clip_block_fraction": CLIP_BLOCK_FRACTION,
        "clip_region_merge_gap_s": CLIP_REGION_MERGE_GAP_S,
        "low_signal_rms_dbfs": LOW_SIGNAL_RMS_DBFS,
        "min_voiced_s": MIN_VOICED_S,
        "segment_merge_gap_s": SEGMENT_MERGE_GAP_S,
        "segment_min_s": SEGMENT_MIN_S,
        "percentile_method": "numpy.percentile, method='linear', over voiced-frame F0 values",
        "analysed_samples": "16-bit PCM samples exactly as written to the derived analysis WAV (int16 / 32768)",
    }


def _r(x: float, nd: int = 6) -> float:
    return float(round(float(x), nd))


def _runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """Inclusive-exclusive index runs where mask is True."""
    if mask.size == 0:
        return []
    d = np.diff(np.concatenate(([0], mask.astype(np.int8), [0])))
    starts = np.flatnonzero(d == 1)
    ends = np.flatnonzero(d == -1)
    return list(zip(starts.tolist(), ends.tolist()))


def _merge(segs: list[list[float]], gap: float) -> list[list[float]]:
    out: list[list[float]] = []
    for s, e in segs:
        if out and s - out[-1][1] < gap:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out


def _dbfs(v: float) -> float | None:
    return None if v <= 0 else 20 * math.log10(v)


def _f0_stat(value, n, reason):
    return {"value": None if value is None else _r(value, 4), "unit": "Hz",
            "unavailable_reason": None if value is not None else reason, "n_frames": int(n)}


def analyze(samples: np.ndarray, sr: int) -> dict:
    """Return measures, contour, segments, jumps and quality flags for mono samples."""
    algo = select_pitch_algorithm()
    n = samples.size
    duration = n / sr
    flags: list[dict] = []

    # ---- levels and clipping (uncalibrated digital levels) ----
    absx = np.abs(samples)
    peak = float(absx.max()) if n else 0.0
    rms = float(np.sqrt(np.mean(samples**2))) if n else 0.0
    peak_db, rms_db = _dbfs(peak), _dbfs(rms)
    level_note = "uncalibrated digital level, not physical loudness"
    clipped = absx >= CLIP_THRESHOLD
    n_clipped = int(clipped.sum())
    clip_frac = n_clipped / n if n else 0.0
    clip_regions = _merge(
        [[s / sr, e / sr] for s, e in _runs(clipped)], CLIP_REGION_MERGE_GAP_S
    )
    clip_regions = [[_r(s, 4), _r(e, 4)] for s, e in clip_regions]

    # ---- pitch ----
    pitch_error = None
    try:
        pitch = algo["fn"](parselmouth.Sound(samples, sr))
        f0 = pitch.selected_array["frequency"].astype(np.float64)
        times = np.asarray(pitch.xs(), dtype=np.float64)
    except parselmouth.PraatError as exc:
        # Praat refuses sounds shorter than its analysis window; anything else is a real failure.
        if duration < 3.0 / PITCH_FLOOR + TIME_STEP:
            pitch_error = "recording_too_short_for_pitch_window"
            f0 = np.zeros(0)
            times = np.zeros(0)
        else:
            raise
    voiced = f0 > 0
    n_frames = int(f0.size)
    n_voiced = int(voiced.sum())
    voiced_duration = n_voiced * TIME_STEP
    vf = f0[voiced]

    enough = voiced_duration >= MIN_VOICED_S
    reason = pitch_error or "insufficient_voiced_material"
    if enough:
        med, p10, p90 = (float(np.percentile(vf, q, method="linear")) for q in (50, 10, 90))
        span = 12 * math.log2(p90 / p10)
        sd_st = float(np.std(12 * np.log2(vf / med), ddof=0))
    else:
        med = p10 = p90 = span = sd_st = None

    # ---- voiced segments (contour itself is never altered) ----
    segs = [[times[s] - TIME_STEP / 2, times[e - 1] + TIME_STEP / 2] for s, e in _runs(voiced)]
    segs = _merge(segs, SEGMENT_MERGE_GAP_S)
    segs = [[_r(max(0.0, s), 4), _r(min(duration, e), 4)] for s, e in segs if e - s >= SEGMENT_MIN_S - 1e-9]

    # ---- suspected octave jumps between adjacent voiced frames (reported, not fixed) ----
    jumps = []
    if n_frames > 1:
        both = voiced[1:] & voiced[:-1]
        idx = np.flatnonzero(both)
        ratios = f0[idx + 1] / f0[idx]
        for i, r in zip(idx.tolist(), ratios.tolist()):
            if r > OCTAVE_JUMP_RATIO or r < 1 / OCTAVE_JUMP_RATIO:
                jumps.append({"t": _r((times[i] + times[i + 1]) / 2, 4), "ratio": _r(r, 4)})

    # ---- quality flags ----
    if clip_frac > CLIP_FLAG_FRACTION:
        flags.append({
            "code": "clipping",
            "message": (f"{clip_frac:.2%} of samples are at or near digital full scale (|x| >= {CLIP_THRESHOLD}). "
                        "This is a recording-level issue: lower the input gain or move back from the mic. "
                        "It says nothing about the voice itself."),
            "blocks_voice_feedback": clip_frac > CLIP_BLOCK_FRACTION,
            "segments": clip_regions,
        })
    if rms_db is None or rms_db < LOW_SIGNAL_RMS_DBFS:
        flags.append({
            "code": "low_signal",
            "message": ("Recording is digitally silent." if rms_db is None else
                        f"Overall level is very low ({rms_db:.1f} dBFS RMS, threshold {LOW_SIGNAL_RMS_DBFS:g}). "
                        "Check the microphone selection and input level."),
            "blocks_voice_feedback": True,
        })
    if not enough:
        flags.append({
            "code": "insufficient_voiced",
            "message": (f"Only {voiced_duration:.2f} s of voiced material was detected (minimum {MIN_VOICED_S} s); "
                        "pitch summaries are unavailable."),
            "blocks_voice_feedback": True,
        })
    if n_voiced and len(jumps) / n_voiced > TRACKING_ERROR_FRACTION:
        flags.append({
            "code": "suspected_tracking_errors",
            "message": (f"{len(jumps)} abrupt frame-to-frame pitch jumps (ratio > {OCTAVE_JUMP_RATIO} or < "
                        f"{1/OCTAVE_JUMP_RATIO:.3f}) over {n_voiced} voiced frames; possible octave or tracking "
                        "errors. They have not been corrected."),
            "blocks_voice_feedback": True,
            "segments": [[_r(j["t"] - TIME_STEP, 4), _r(j["t"] + TIME_STEP, 4)] for j in jumps],
        })

    measures = {
        "duration_s": {"value": _r(duration, 4), "unit": "s"},
        "voiced_duration_s": {
            "value": _r(voiced_duration, 4), "unit": "s",
            "definition": f"number of voiced pitch frames x time step ({TIME_STEP} s)",
        },
        "voiced_frame_coverage": {
            "value": _r(n_voiced / n_frames, 4) if n_frames else None,
            "unavailable_reason": None if n_frames else (pitch_error or "no_analysis_frames"),
            "numerator": n_voiced, "denominator": n_frames,
            "definition": "voiced pitch frames / total analysed pitch frames",
        },
        "f0_median_hz": _f0_stat(med, n_voiced, reason),
        "f0_p10_hz": _f0_stat(p10, n_voiced, reason),
        "f0_p90_hz": _f0_stat(p90, n_voiced, reason),
        "f0_p10_p90_span_st": {
            "value": None if span is None else _r(span, 4), "unit": "st",
            "unavailable_reason": None if span is not None else reason,
            "definition": "12*log2(p90/p10)",
        },
        "f0_sd_st": {
            "value": None if sd_st is None else _r(sd_st, 4), "unit": "st",
            "unavailable_reason": None if sd_st is not None else reason,
            "definition": "SD of 12*log2(f0/median) over voiced frames (population SD, ddof=0)",
        },
        "peak_dbfs": {"value": None if peak_db is None else _r(peak_db, 3), "unit": "dBFS",
                      "unavailable_reason": None if peak_db is not None else "digital_silence",
                      "note": level_note},
        "rms_dbfs": {"value": None if rms_db is None else _r(rms_db, 3), "unit": "dBFS",
                     "unavailable_reason": None if rms_db is not None else "digital_silence",
                     "note": level_note},
        "clipped_sample_fraction": {
            "value": _r(clip_frac, 6), "numerator": n_clipped, "denominator": int(n),
            "definition": f"samples with |x| >= {CLIP_THRESHOLD} / total samples",
        },
    }

    contour = {
        "time_step": TIME_STEP,
        "t0": _r(times[0], 6) if n_frames else None,
        "n_frames": n_frames,
        "f0_hz": [(_r(v, 3) if v > 0 else None) for v in f0.tolist()],
        "note": "null = unvoiced frame; values are never interpolated or corrected",
    }

    return {
        "measures": measures,
        "contour": contour,
        "voiced_segments": segs,
        "clipping_regions": clip_regions,
        "suspected_octave_jumps": jumps,
        "quality_flags": flags,
    }
