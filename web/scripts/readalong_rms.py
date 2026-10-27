"""Write 25 ms RMS frames of the macOS `say` fixtures for the read-along calibration test.

Run: ../analysis/.venv/bin/python -I scripts/readalong_rms.py
"""
import json, subprocess, tempfile, wave, pathlib
import numpy as np

FIX = pathlib.Path(__file__).resolve().parents[2] / "analysis" / "tests" / "fixtures"
# Syllable counts of the sentences in analysis/tests/make_fixtures.py, counted by hand.
SETS = {"say_samantha": 20, "say_daniel": 16, "say_karen": 16}

out = []
for name, syl in SETS.items():
    with tempfile.TemporaryDirectory() as d:
        wav = pathlib.Path(d) / "x.wav"
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@48000", "-c", "1", str(FIX / f"{name}.aiff"), str(wav)], check=True)
        w = wave.open(str(wav))
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    hop = int(sr * 0.025)
    rms = [float(np.sqrt(np.mean(x[i:i + 2048] ** 2))) for i in range(0, len(x) - 2048, hop)]
    out.append({"name": name, "syllables": syl, "rms": rms})
(FIX / "say_rms.json").write_text(json.dumps(out))
print("wrote", FIX / "say_rms.json")
