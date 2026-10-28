"""Software and measurement tests for lilt_analysis on synthetic fixtures.

Tolerances are declared here, before any result is checked, and were fixed before running the
suite. They apply to synthetic signals only; passing them says nothing about accuracy on natural
speech (which has not been validated).
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import wave

import numpy as np
import pytest

import make_fixtures as M
from scoring import contour_array, frame_times, score

from lilt_analysis.cli import main

TOLERANCES = {
    # clean known-frequency tones (sines, harmonic complexes, clipped tone)
    "median_rel_err": 0.01,            # |median/true - 1| <= 1 %
    "gross_error_rel": 0.20,           # a frame is a gross error if > 20 % off the true F0
    "gross_error_rate_max": 0.01,      # < 1 % of scorable voiced frames may be gross errors
    "min_coverage_clean": 0.95,        # >= 95 % of scorable voiced frames reported voiced
    # glide 150 -> 300 Hz
    "glide_frame_rel_err_p95": 0.02,   # 95th percentile of per-frame relative error <= 2 %
    "glide_down_step_tol": 0.005,      # a frame-to-frame decrease larger than 0.5 % is a "down step"
    "glide_down_step_fraction_max": 0.02,
    # mixed voiced/unvoiced
    "segment_boundary_s": 0.030,       # voiced segment edges within 30 ms of the truth
    # lossy codecs (opus/aac) on a clean harmonic tone
    "codec_median_rel_err": 0.01,
    # repeat analysis of identical audio
    "repeat_identical": True,          # measures must be exactly identical (no tolerance)
}


FIXTURES = {f.name: f for f in M.build_fixtures()}


def _sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def run_cli(path, tmp_path, tag="run", sha=None):
    out = tmp_path / f"{tag}.json"
    wav = tmp_path / f"{tag}.analysis.wav"
    code = main(["--input", str(path), "--wav-out", str(wav), "--out", str(out),
                 "--source-sha256", sha or _sha(path), "--run-id", tag])
    return code, json.loads(out.read_text())


@pytest.fixture(scope="module")
def wavdir(tmp_path_factory):
    d = tmp_path_factory.mktemp("fx")
    for f in FIXTURES.values():
        M.write_wav16(str(d / f"{f.name}.wav"), f.x, f.sr)
    return d


@pytest.fixture(scope="module")
def encdir(tmp_path_factory):
    d = tmp_path_factory.mktemp("enc")
    return M.make_encoded(str(d))


def analyse_fixture(name, wavdir, tmp_path):
    code, doc = run_cli(wavdir / f"{name}.wav", tmp_path, tag=name)
    assert code == 0 and doc["status"] == "ok", doc.get("error")
    return doc


def codes(doc):
    return {f["code"] for f in doc["quality_flags"]}


# --------------------------------------------------------------------------- clean tones
@pytest.mark.parametrize("name", ["sine_110", "sine_220", "sine_330", "harmonic_140", "harmonic_240", "clipped_200"])
def test_clean_tone_accuracy(name, wavdir, tmp_path):
    fx = FIXTURES[name]
    doc = analyse_fixture(name, wavdir, tmp_path)
    med = doc["measures"]["f0_median_hz"]["value"]
    assert med is not None
    assert abs(med / fx.expect["median"] - 1) <= TOLERANCES["median_rel_err"]
    s = score(doc, fx.truth, TOLERANCES["gross_error_rel"])
    assert s["n_scorable_voiced"] > 150
    assert s["gross_error_rate"] < TOLERANCES["gross_error_rate_max"]
    assert s["coverage_of_scorable_voiced"] >= TOLERANCES["min_coverage_clean"]
    assert doc["suspected_octave_jumps"] == []


def test_glide_tracks_monotonically(wavdir, tmp_path):
    fx = FIXTURES["glide_150_300"]
    doc = analyse_fixture("glide_150_300", wavdir, tmp_path)
    t, f = frame_times(doc), contour_array(doc)
    ok = np.isfinite(f)
    rel = np.abs(f[ok] / fx.truth(t[ok]) - 1)
    assert np.percentile(rel, 95) <= TOLERANCES["glide_frame_rel_err_p95"]
    steps = f[ok][1:] / f[ok][:-1]
    down = np.mean(steps < 1 - TOLERANCES["glide_down_step_tol"])
    assert down <= TOLERANCES["glide_down_step_fraction_max"]
    assert score(doc, fx.truth)["gross_error_rate"] < TOLERANCES["gross_error_rate_max"]
    m = doc["measures"]
    assert m["f0_p10_hz"]["value"] < m["f0_median_hz"]["value"] < m["f0_p90_hz"]["value"]
    span = m["f0_p10_p90_span_st"]["value"]
    assert span == pytest.approx(12 * np.log2(m["f0_p90_hz"]["value"] / m["f0_p10_hz"]["value"]), abs=1e-3)


# --------------------------------------------------------------------------- abstention
@pytest.mark.parametrize("name,expected_flags", [
    ("silence", {"low_signal", "insufficient_voiced"}),
    ("low_noise", {"low_signal", "insufficient_voiced"}),
    ("white_noise", {"insufficient_voiced"}),
])
def test_silence_and_noise_abstain(name, expected_flags, wavdir, tmp_path):
    doc = analyse_fixture(name, wavdir, tmp_path)
    m = doc["measures"]
    for k in ("f0_median_hz", "f0_p10_hz", "f0_p90_hz", "f0_p10_p90_span_st", "f0_sd_st"):
        assert m[k]["value"] is None
        assert m[k]["unavailable_reason"] == "insufficient_voiced_material"
    assert all(v is None for v in doc["contour"]["f0_hz"])
    assert doc["voiced_segments"] == []
    assert expected_flags <= codes(doc)
    for fl in doc["quality_flags"]:
        if fl["code"] in ("low_signal", "insufficient_voiced"):
            assert fl["blocks_voice_feedback"] is True
    if name == "silence":
        assert m["rms_dbfs"]["value"] is None and m["rms_dbfs"]["unavailable_reason"] == "digital_silence"
    if name == "white_noise":
        assert "low_signal" not in codes(doc)


def test_clipping_flagged_with_regions(wavdir, tmp_path):
    doc = analyse_fixture("clipped_200", wavdir, tmp_path)
    flag = next(f for f in doc["quality_flags"] if f["code"] == "clipping")
    frac = doc["measures"]["clipped_sample_fraction"]["value"]
    assert frac > 0.01 and flag["blocks_voice_feedback"] is True
    assert doc["clipping_regions"] and flag["segments"] == doc["clipping_regions"]
    s, e = doc["clipping_regions"][0][0], doc["clipping_regions"][-1][1]
    assert s < 0.05 and e > 1.95
    # unclipped tone: no clipping flag
    doc2 = analyse_fixture("sine_220", wavdir, tmp_path)
    assert "clipping" not in codes(doc2) and doc2["clipping_regions"] == []


def test_mild_clipping_flag_does_not_block(tmp_path):
    x = 0.5 * np.sin(2 * np.pi * 200 * np.arange(2 * M.SR) / M.SR)
    x[1000:1000 + 300] = 1.0  # 300 / 96000 = 0.31 % clipped: flagged, below 1 % block threshold
    p = tmp_path / "mild.wav"
    M.write_wav16(str(p), x, M.SR)
    code, doc = run_cli(p, tmp_path, "mild")
    flag = next(f for f in doc["quality_flags"] if f["code"] == "clipping")
    assert flag["blocks_voice_feedback"] is False


def test_mixed_voiced_unvoiced(wavdir, tmp_path):
    fx = FIXTURES["mixed_voiced_unvoiced"]
    doc = analyse_fixture("mixed_voiced_unvoiced", wavdir, tmp_path)
    s = score(doc, fx.truth)
    assert s["unvoiced_false_alarms"] == 0  # contour null over noise and silence
    assert s["gross_error_rate"] < TOLERANCES["gross_error_rate_max"]
    segs = doc["voiced_segments"]
    assert len(segs) == len(fx.voiced_intervals)
    for (s0, e0), (s1, e1) in zip(segs, fx.voiced_intervals):
        assert abs(s0 - s1) <= TOLERANCES["segment_boundary_s"]
        assert abs(e0 - e1) <= TOLERANCES["segment_boundary_s"]
    cov = doc["measures"]["voiced_frame_coverage"]
    assert cov["denominator"] == len(doc["contour"]["f0_hz"])
    assert cov["numerator"] == sum(v is not None for v in doc["contour"]["f0_hz"])


def test_octave_jump_reported_not_fixed(wavdir, tmp_path):
    doc = analyse_fixture("octave_jump", wavdir, tmp_path)
    jumps = doc["suspected_octave_jumps"]
    assert jumps, "expected suspected octave jumps"
    assert any(abs(j["t"] - 0.6) < 0.05 and j["ratio"] > 1.8 for j in jumps)
    assert any(abs(j["t"] - 1.4) < 0.05 and j["ratio"] < 0.556 for j in jumps)
    # contour is left as tracked (contains both ~200 and ~400 Hz values)
    f = contour_array(doc)
    assert np.nanmax(f) > 380 and np.nanmin(f) < 220


def test_mild_subharmonic_tracked_at_the_true_pitch(tmp_path):
    """A 190 Hz voice whose every other cycle is 20% weaker (mild unevenness, common in real
    recordings) must be tracked at 190 Hz, not at its subharmonics (95 or 63 Hz)."""
    sr, f0 = 16000, 190.0
    t = np.arange(int(sr * 3.0)) / sr
    x = sum((1 / k) * np.sin(2 * np.pi * k * f0 * t) for k in range(1, 25))
    x = x * np.where(np.floor(t * f0).astype(int) % 2 == 0, 1.0, 0.8)
    wav = tmp_path / "subharmonic.wav"
    M.write_wav16(str(wav), 0.3 * x / np.abs(x).max(), sr)
    code, doc = run_cli(wav, tmp_path, tag="subharmonic")
    assert code == 0 and doc["status"] == "ok"
    assert abs(doc["measures"]["f0_median_hz"]["value"] / f0 - 1) <= TOLERANCES["median_rel_err"]


# --------------------------------------------------------------------------- reproducibility
def test_same_audio_twice_identical(wavdir, tmp_path):
    _, a = run_cli(wavdir / "mixed_voiced_unvoiced.wav", tmp_path, "a")
    _, b = run_cli(wavdir / "mixed_voiced_unvoiced.wav", tmp_path, "b")
    for k in ("measures", "contour", "voiced_segments", "suspected_octave_jumps", "quality_flags",
              "clipping_regions", "method"):
        assert a[k] == b[k], k
    assert a["derived_wav"]["sha256"] == b["derived_wav"]["sha256"]


def test_reanalysis_of_derived_wav_matches(wavdir, tmp_path):
    """The derived 16-bit WAV reproduces the original analysis exactly."""
    _, a = run_cli(wavdir / "harmonic_140.wav", tmp_path, "a")
    _, b = run_cli(tmp_path / "a.analysis.wav", tmp_path, "b")
    assert a["measures"] == b["measures"] and a["contour"] == b["contour"]


# --------------------------------------------------------------------------- decoding
@pytest.mark.parametrize("ext,codec", [("webm", "opus"), ("mp4", "aac")])
def test_browser_containers_decode(ext, codec, encdir, tmp_path):
    code, doc = run_cli(encdir[f"harmonic_240.{ext}"], tmp_path, ext)
    assert code == 0 and doc["status"] == "ok"
    assert doc["source"]["codec"] == codec
    assert doc["source"]["decode_truncated"] is False
    assert doc["source"]["decoded_sample_rate"] == 48000
    assert abs(doc["measures"]["f0_median_hz"]["value"] / 240 - 1) <= TOLERANCES["codec_median_rel_err"]
    with wave.open(str(tmp_path / f"{ext}.analysis.wav")) as w:
        assert w.getsampwidth() == 2 and w.getnchannels() == 1
    assert doc["derived_wav"]["note"] == "derived analysis copy; not a lossless original"


@pytest.mark.parametrize("ext", ["webm", "mp4"])
def test_truncated_stream_decodes_prefix(ext, encdir, tmp_path):
    p = encdir[f"harmonic_240_truncated.{ext}"]
    before = _sha(p)
    code, doc = run_cli(p, tmp_path, "trunc")
    assert code == 0 and doc["status"] == "ok"
    assert doc["source"]["decode_truncated"] is True
    assert doc["source"]["decode_truncation_evidence"]
    flag = next(f for f in doc["quality_flags"] if f["code"] == "decode_truncated")
    assert flag["blocks_voice_feedback"] is False
    dur = doc["measures"]["duration_s"]["value"]
    assert 0.5 < dur < 1.9
    assert abs(doc["measures"]["f0_median_hz"]["value"] / 240 - 1) <= TOLERANCES["codec_median_rel_err"]
    assert _sha(p) == before  # input untouched


def test_mixed_webm_segments(encdir, tmp_path):
    fx = FIXTURES["mixed_voiced_unvoiced"]
    _, doc = run_cli(encdir["mixed_voiced_unvoiced.webm"], tmp_path, "mw")
    segs = doc["voiced_segments"]
    assert len(segs) == 2
    for (s0, e0), (s1, e1) in zip(segs, fx.voiced_intervals):
        assert abs(s0 - s1) <= TOLERANCES["segment_boundary_s"] and abs(e0 - e1) <= TOLERANCES["segment_boundary_s"]


def test_stereo_is_mixed_to_mono(tmp_path):
    t = np.arange(M.SR) / M.SR
    left, right = 0.4 * np.sin(2 * np.pi * 220 * t), 0.4 * np.sin(2 * np.pi * 220 * t)
    pcm = np.round(np.stack([left, right], axis=1) * 32767).astype("<i2")
    p = tmp_path / "stereo.wav"
    with wave.open(str(p), "wb") as w:
        w.setnchannels(2), w.setsampwidth(2), w.setframerate(M.SR)
        w.writeframes(pcm.tobytes())
    code, doc = run_cli(p, tmp_path, "st")
    assert code == 0 and doc["source"]["decoded_channels_original"] == 2
    assert abs(doc["measures"]["f0_median_hz"]["value"] / 220 - 1) <= TOLERANCES["median_rel_err"]


# --------------------------------------------------------------------------- failures
def test_garbage_input_fails_without_numbers(tmp_path):
    p = tmp_path / "garbage.webm"
    p.write_bytes(b"\x00not audio at all\xff" * 100)
    before = _sha(p)
    code, doc = run_cli(p, tmp_path, "g")
    assert code != 0
    assert doc["status"] == "failed" and doc["error"]["code"] in ("decode_failed", "no_audio_decoded")
    assert doc["measures"] is None and "contour" not in doc
    assert _sha(p) == before


def test_sha_mismatch_fails(wavdir, tmp_path):
    code, doc = run_cli(wavdir / "sine_220.wav", tmp_path, "m", sha="0" * 64)
    assert code != 0 and doc["status"] == "failed" and doc["error"]["code"] == "source_sha256_mismatch"


def test_too_short_recording(tmp_path):
    p = tmp_path / "short.wav"
    M.write_wav16(str(p), 0.5 * np.sin(2 * np.pi * 200 * np.arange(1200) / M.SR), M.SR)  # 25 ms
    code, doc = run_cli(p, tmp_path, "s")
    assert code == 0 and doc["status"] == "ok"
    assert doc["measures"]["f0_median_hz"]["value"] is None
    assert doc["measures"]["voiced_frame_coverage"]["denominator"] == 0
    assert "insufficient_voiced" in codes(doc)


def test_cli_subprocess_and_atomic_output(wavdir, tmp_path):
    import subprocess
    import sys
    src = wavdir / "sine_220.wav"
    out, wav = tmp_path / "run.json", tmp_path / "analysis.wav"
    r = subprocess.run([sys.executable, "-m", "lilt_analysis", "--input", str(src), "--wav-out", str(wav),
                        "--out", str(out), "--source-sha256", _sha(src)], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    doc = json.loads(out.read_text())
    assert doc["schema"] == "lilt.analysis/1" and doc["use_status"] == "descriptive_only"
    assert doc["method"]["pitch_algorithm"] in ("filtered_ac", "ac")
    assert doc["method"]["params"]["pitch_floor"] == 60 and doc["method"]["params"]["time_step"] == 0.01
    assert not [n for n in os.listdir(tmp_path) if n.startswith(".tmp-")]


# --------------------------------------------------------------------------- synthetic TTS speech
SAY = shutil.which("say")


@pytest.mark.skipif(not SAY, reason="macOS `say` not available")
def test_tts_speech_runs(tmp_path):
    """TTS is synthetic speech, not natural speech; this only checks the pipeline runs and produces
    plausible summaries. Algorithm agreement is reported by scripts/evaluate.py, not asserted."""
    paths = M.make_say(str(tmp_path))
    assert paths
    for name, p in paths.items():
        code, doc = run_cli(p, tmp_path, name)
        assert code == 0 and doc["status"] == "ok"
        assert doc["measures"]["f0_median_hz"]["value"] is not None
        assert 60 <= doc["measures"]["f0_median_hz"]["value"] <= 700
