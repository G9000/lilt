"""Decode browser recordings (webm/opus, mp4/aac, wav, ...) to mono float64 with PyAV.

The valid prefix of a truncated stream is kept. Truncation is reported, never hidden.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import av
import numpy as np


class DecodeError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class DecodedAudio:
    samples: np.ndarray  # mono float64, nominal range [-1, 1]
    sample_rate: int
    channels_original: int
    codec: str
    container: str
    truncated: bool
    truncation_evidence: list[str] = field(default_factory=list)
    decoder_messages: list[str] = field(default_factory=list)


# Demuxer/decoder messages (ERROR level or worse) that indicate the stream ended abruptly
# or that the tail is damaged. Matched case-insensitively.
_TRUNCATION_PATTERNS = (
    "ended prematurely",
    "truncat",
    "read error",
    "packet corrupt",
    "invalid data",
    "input buffer exhausted",
    "incomplete",
    "partial",
    "eof",
)

# A declared container duration exceeding the decoded duration by more than this counts as
# truncation evidence (MediaRecorder webm usually declares no duration at all).
DURATION_SHORTFALL_S = 0.25

_INT_SCALE = {"u8": 128.0, "s16": 32768.0, "s32": 2147483648.0, "s64": 9223372036854775808.0}


def _frame_to_channels(frame: av.AudioFrame) -> np.ndarray:
    """Return (channels, n) float64 without resampling or changing the sample rate."""
    arr = frame.to_ndarray()
    fmt = frame.format.name.rstrip("p")  # 'fltp' -> 'flt', 's16p' -> 's16'
    nch = frame.layout.nb_channels
    if frame.format.is_planar:
        data = arr.reshape(nch, -1)
    else:
        data = arr.reshape(-1, nch).T
    data = data.astype(np.float64)
    if fmt == "u8":
        data = (data - 128.0) / 128.0
    elif fmt in _INT_SCALE:
        data = data / _INT_SCALE[fmt]
    elif fmt not in ("flt", "dbl"):
        raise DecodeError("unsupported_sample_format", f"unsupported decoded sample format {frame.format.name}")
    return data


def decode_to_mono(path: str) -> DecodedAudio:
    prev_level = av.logging.get_level()
    av.logging.set_level(av.logging.ERROR)
    try:
        with av.logging.Capture(True) as logs:
            result = _decode(path, logs)
    finally:
        av.logging.set_level(prev_level)
    return result


def _decode(path: str, logs: list) -> DecodedAudio:
    try:
        container = av.open(path, mode="r")
    except (av.FFmpegError, OSError) as exc:
        raise DecodeError("decode_failed", f"could not open input as audio: {exc}") from exc

    try:
        if not container.streams.audio:
            raise DecodeError("no_audio_stream", "input contains no audio stream")
        stream = container.streams.audio[0]
        ctx = stream.codec_context
        codec = ctx.name
        sample_rate = int(stream.rate or ctx.sample_rate or 0)
        channels_original = int(ctx.layout.nb_channels) if ctx.layout else 0
        container_name = container.format.name
        declared_duration = (container.duration / 1_000_000.0) if container.duration else None

        chunks: list[np.ndarray] = []
        evidence: list[str] = []
        mid_stream_exception: str | None = None
        try:
            for packet in container.demux(stream):
                if packet.is_corrupt:
                    evidence.append("demuxer marked a packet as corrupt")
                for frame in packet.decode():
                    if frame.sample_rate != sample_rate:
                        raise DecodeError(
                            "sample_rate_changed",
                            f"sample rate changed mid-stream ({sample_rate} -> {frame.sample_rate})",
                        )
                    chunks.append(_frame_to_channels(frame).mean(axis=0))
        except DecodeError:
            raise
        except (av.FFmpegError, ValueError, OSError) as exc:
            mid_stream_exception = f"{type(exc).__name__}: {exc}"
    finally:
        container.close()

    messages = [f"[{name}] {msg.strip()}" for level, name, msg in logs if level <= av.logging.ERROR]

    if not chunks:
        detail = mid_stream_exception or "no audio frames decoded"
        raise DecodeError("no_audio_decoded", f"no decodable audio: {detail}")

    samples = np.concatenate(chunks).astype(np.float64)
    decoded_duration = samples.size / sample_rate

    if mid_stream_exception:
        evidence.append(f"decoding stopped with an error after {decoded_duration:.3f} s: {mid_stream_exception}")
    for m in messages:
        if any(p in m.lower() for p in _TRUNCATION_PATTERNS):
            evidence.append(f"decoder log: {m}")
    if declared_duration is not None and declared_duration - decoded_duration > DURATION_SHORTFALL_S:
        evidence.append(
            f"container declares {declared_duration:.3f} s but only {decoded_duration:.3f} s decoded"
        )
    # de-duplicate while preserving order
    evidence = list(dict.fromkeys(evidence))

    return DecodedAudio(
        samples=samples,
        sample_rate=sample_rate,
        channels_original=channels_original,
        codec=codec,
        container=container_name,
        truncated=bool(evidence),
        truncation_evidence=evidence,
        decoder_messages=messages,
    )
