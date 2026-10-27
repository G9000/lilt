"""Frame-level scoring of a run.json contour against a synthetic fixture's known truth.

Shared by the tests and scripts/evaluate.py so both use the same definitions.

A frame is *scorable as voiced* when the truth is voiced and (nearly) constant across the whole
Praat analysis window (3 / pitch floor = 50 ms, i.e. t +/- 25 ms); frames straddling a
truth change or a voiced/unvoiced boundary are excluded from error statistics. A frame is
*scorable as unvoiced* when the truth is unvoiced across the whole window.
"""

from __future__ import annotations

import numpy as np

HALF_WINDOW_S = 0.025  # 1.5 / 60 Hz floor


def frame_times(doc: dict) -> np.ndarray:
    c = doc["contour"]
    return c["t0"] + c["time_step"] * np.arange(len(c["f0_hz"]))


def contour_array(doc: dict) -> np.ndarray:
    return np.array([np.nan if v is None else v for v in doc["contour"]["f0_hz"]], dtype=float)


def score(doc: dict, truth, gross_rel: float = 0.20) -> dict:
    t = frame_times(doc)
    f = contour_array(doc)
    if truth is None:
        tv = np.full((3, t.size), np.nan)
    else:
        tv = np.vstack([np.asarray(truth(t + d), dtype=float) for d in (-HALF_WINDOW_S, 0.0, HALF_WINDOW_S)])
    ref = tv[1]
    all_voiced = np.all(np.isfinite(tv), axis=0)
    steady = all_voiced.copy()
    steady[all_voiced] = tv[:, all_voiced].max(axis=0) / tv[:, all_voiced].min(axis=0) < 1.05
    all_unvoiced = np.all(~np.isfinite(tv), axis=0)

    est_voiced = np.isfinite(f)
    sv = steady  # scorable voiced frames
    both = sv & est_voiced
    rel = np.abs(f[both] / ref[both] - 1.0)
    n_sv = int(sv.sum())
    return {
        "n_frames": int(t.size),
        "n_scorable_voiced": n_sv,
        "n_scorable_unvoiced": int(all_unvoiced.sum()),
        "voiced_misses": int((sv & ~est_voiced).sum()),  # truth voiced, reported unvoiced
        "unvoiced_false_alarms": int((all_unvoiced & est_voiced).sum()),  # truth unvoiced, reported voiced
        "median_rel_err_of_frames": float(np.median(rel)) if rel.size else None,
        "gross_errors": int((rel > gross_rel).sum()),
        # gross error rate over scorable voiced frames that the tracker reported voiced
        "gross_error_rate": float((rel > gross_rel).mean()) if rel.size else None,
        "coverage_of_scorable_voiced": float(both.sum() / n_sv) if n_sv else None,
    }
