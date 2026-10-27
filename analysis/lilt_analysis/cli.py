"""Command-line entry point.

    python -m lilt_analysis --input <original> --wav-out <analysis.wav> --out <run.json>
                            --source-sha256 <hex> [--run-id <id>]

Exit codes: 0 ok; 2 usage error; 3 input/decode failure; 4 analysis failure;
5 could not write outputs. On every failure after argument parsing a run.json with
status "failed" is written (unless writing it is itself what failed).
"""

from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import re
import sys
import tempfile
import uuid
import wave

import numpy as np

from . import analyze as A
from .decode import DecodeError, decode_to_mono

SCHEMA = "lilt.analysis/1"
USE_STATUS_NOTE = (
    "Pitch measures have not been validated against independent reference contours on natural "
    "speech; they are shown descriptively and must not drive corrective feedback."
)


class Failure(Exception):
    def __init__(self, code: str, message: str, exit_code: int):
        super().__init__(message)
        self.code, self.message, self.exit_code = code, message, exit_code


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _fsync_dir(path: str) -> None:
    try:
        fd = os.open(os.path.dirname(os.path.abspath(path)) or ".", os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(fd)
    except OSError:
        pass
    finally:
        os.close(fd)


def atomic_write_bytes(path: str, writer) -> None:
    """writer(fileobj) writes the content; tmp file in the same dir, fsync, rename, fsync dir."""
    d = os.path.dirname(os.path.abspath(path))
    fd, tmp = tempfile.mkstemp(prefix=".tmp-", suffix=os.path.basename(path), dir=d)
    try:
        with os.fdopen(fd, "wb") as f:
            writer(f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
    _fsync_dir(path)


def to_int16(x: np.ndarray) -> np.ndarray:
    return np.round(np.clip(x, -1.0, 32767 / 32768) * 32768.0).astype(np.int16)


def write_wav16(path: str, pcm: np.ndarray, sr: int) -> None:
    def w(f):
        with wave.open(f, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(pcm.astype("<i2").tobytes())

    atomic_write_bytes(path, w)


def write_json(path: str, doc: dict) -> None:
    data = (json.dumps(doc, indent=2, allow_nan=False) + "\n").encode("utf-8")
    atomic_write_bytes(path, lambda f: f.write(data))


def _new_doc(args) -> dict:
    return {
        "schema": SCHEMA,
        "status": "failed",
        "run_id": args.run_id or str(uuid.uuid4()),
        "created_utc": _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "source": {"sha256": args.source_sha256.lower()},
    }


def run(args, doc: dict) -> int:
    """Fill doc in place; raises Failure. doc keeps whatever was learned before a failure."""
    try:
        doc["method"] = A.method_block()
    except Exception as exc:  # bundled Praat unusable
        doc["method"] = {"name": "lilt-analysis", "version": "1"}
        raise Failure("analysis_unavailable", f"pitch analysis self-check failed: {exc}", 4) from exc

    inp = os.path.abspath(args.input)
    if not os.path.isfile(inp):
        raise Failure("input_not_found", f"input file not found: {args.input}", 3)
    for p in (args.wav_out, args.out):
        if os.path.exists(p) and os.path.samefile(p, inp):
            raise Failure("output_would_overwrite_input", f"output path {p} is the input file", 2)

    actual = sha256_file(inp)
    if actual != args.source_sha256.lower():
        raise Failure("source_sha256_mismatch",
                      f"input sha256 {actual} does not match --source-sha256 {args.source_sha256}", 3)

    try:
        dec = decode_to_mono(inp)
    except DecodeError as exc:
        raise Failure(exc.code, exc.message, 3) from exc
    doc["source"].update({
        "decoded_sample_rate": dec.sample_rate,
        "decoded_channels_original": dec.channels_original,
        "codec": dec.codec,
        "container": dec.container,
        "decode_truncated": dec.truncated,
        "decode_truncation_evidence": dec.truncation_evidence,
        "mono_mix": "arithmetic mean of channels" if dec.channels_original > 1 else "already mono",
    })

    pcm = to_int16(dec.samples)
    try:
        write_wav16(args.wav_out, pcm, dec.sample_rate)
    except OSError as exc:
        raise Failure("wav_write_failed", f"could not write analysis wav: {exc}", 5) from exc
    doc["derived_wav"] = {
        "path_hint": os.path.basename(args.wav_out),
        "sha256": sha256_file(args.wav_out),
        "format": "WAV, 16-bit PCM, mono, native decoded sample rate",
        "note": "derived analysis copy; not a lossless original",
    }

    try:
        result = A.analyze(pcm.astype(np.float64) / 32768.0, dec.sample_rate)
    except Exception as exc:
        raise Failure("analysis_failed", f"{type(exc).__name__}: {exc}", 4) from exc

    if dec.truncated:
        result["quality_flags"].append({
            "code": "decode_truncated",
            "message": ("The recording ends abruptly (incomplete upload or interrupted capture); only the "
                        "decodable beginning was analysed."),
            "blocks_voice_feedback": False,
        })

    doc["status"] = "ok"
    doc.update(result)
    doc["use_status"] = "descriptive_only"
    doc["use_status_note"] = USE_STATUS_NOTE
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="lilt_analysis", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input", required=True, help="original recording (read only)")
    ap.add_argument("--wav-out", required=True, help="derived 16-bit mono analysis WAV to write")
    ap.add_argument("--out", required=True, help="run.json to write")
    ap.add_argument("--source-sha256", required=True, help="sha256 hex of the original file")
    ap.add_argument("--run-id", default=None)
    args = ap.parse_args(argv)
    if not re.fullmatch(r"[0-9a-fA-F]{64}", args.source_sha256):
        ap.error("--source-sha256 must be 64 hex characters")

    doc = _new_doc(args)
    try:
        code = run(args, doc)
    except Failure as f:
        _mark_failed(doc, f.code, f.message)
        code = f.exit_code
    except Exception as exc:  # unexpected: still never fabricate numbers
        _mark_failed(doc, "internal_error", f"{type(exc).__name__}: {exc}")
        code = 4

    try:
        write_json(args.out, doc)
    except (OSError, ValueError) as exc:
        print(f"lilt_analysis: could not write {args.out}: {exc}", file=sys.stderr)
        return 5
    if code:
        print(f"lilt_analysis: failed: {doc['error']['code']}: {doc['error']['message']}", file=sys.stderr)
    return code


def _mark_failed(doc: dict, code: str, message: str) -> None:
    """Failed runs carry no measurement fields at all, only what was learned about the input."""
    for key in ("measures", "contour", "voiced_segments", "clipping_regions",
                "suspected_octave_jumps", "quality_flags"):
        doc.pop(key, None)
    doc["status"] = "failed"
    doc["error"] = {"code": code, "message": message}
    doc["measures"] = None
    doc["use_status"] = "descriptive_only"
    doc["use_status_note"] = USE_STATUS_NOTE
    if "method" not in doc:
        try:
            doc["method"] = A.method_block()
        except Exception:
            doc["method"] = {"name": "lilt-analysis", "version": "1"}
