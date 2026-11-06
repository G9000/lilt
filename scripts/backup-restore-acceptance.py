"""Real HTTP backup/restore acceptance using only a fresh target-contained data folder.

Build a scratch binary first, then run from any directory:
  analysis/.venv/Scripts/python.exe scripts/backup-restore-acceptance.py
  python scripts/backup-restore-acceptance.py --binary path/to/scratch/lilt

The server gets an unused loopback port and is always stopped by its exact child handle.
Artifacts (report, server log, original/safety ZIPs) remain under target for inspection.
No real microphone, cloud provider, browser or owner data is involved.
"""

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid
import zipfile


ROOT = Path(__file__).resolve().parents[1]
HEADER = "X-Lilt-Generation"
PNG = bytes.fromhex("89504e470d0a1a0a00000000")


def sha(data):
    return hashlib.sha256(data).hexdigest()


class Acceptance:
    def __init__(self, binary):
        target = ROOT / "target"
        target.mkdir(exist_ok=True)
        self.scratch = Path(tempfile.mkdtemp(prefix="backup-network-", dir=target))
        self.data = self.scratch / "data"
        self.data.mkdir()
        (self.data / ".private").mkdir()
        (self.data / ".private" / "acceptance.txt").write_bytes(b"synthetic local credential sentinel")
        (self.data / "agents.json").write_text('{"Acceptance":{"last_tool":"test","last_used":"2026-11-07T00:00:00Z"}}', encoding="utf-8")
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            self.port = sock.getsockname()[1]
        assert self.port != 7878
        self.base = f"http://127.0.0.1:{self.port}"
        self.binary = binary.resolve(strict=True)
        self.generation = None
        self.child = None
        self.log = None
        self.report = {"scratch": str(self.scratch), "binary": str(self.binary), "port": self.port, "checks": []}

    def check(self, name, condition, detail=None):
        self.report["checks"].append({"name": name, "passed": bool(condition), "detail": detail})
        print(f"{'PASS' if condition else 'FAIL'} {name}", flush=True)
        assert condition, f"{name}: {detail}"

    def request(self, method, path, value=None, *, raw=None, generation=True, headers=None, expected=200):
        h = dict(headers or {})
        if generation and self.generation:
            h[HEADER] = self.generation if generation is True else generation
        if raw is not None:
            body = raw
            h.setdefault("Content-Type", "application/octet-stream")
        elif value is not None:
            body = json.dumps(value).encode()
            h.setdefault("Content-Type", "application/json")
        else:
            body = None
        req = urllib.request.Request(self.base + path, data=body, headers=h, method=method)
        try:
            response = urllib.request.urlopen(req, timeout=120)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            status, response_headers, content = response.status, response.headers, response.read()
        try:
            parsed = json.loads(content)
        except (ValueError, UnicodeDecodeError):
            parsed = content
        if expected is not None:
            allowed = (expected,) if isinstance(expected, int) else expected
            assert status in allowed, f"{method} {path}: HTTP {status}: {str(parsed)[:1000]}"
        return parsed, response_headers, status

    def api(self, method, path, value=None, **kwargs):
        return self.request(method, path, value, **kwargs)[0]

    def start(self):
        env = os.environ.copy()
        for key in list(env):
            if key.startswith("LILT_"):
                env.pop(key)
        temporary = self.scratch / "temp"
        temporary.mkdir(exist_ok=True)
        env.update({"LILT_DATA_DIR": str(self.data), "LILT_BIND": f"127.0.0.1:{self.port}",
                    "LILT_CONTENT_DIR": str(ROOT / "content"), "LILT_ANALYSIS_DIR": str(ROOT / "analysis"),
                    "LILT_WEB_DIR": str(self.scratch / "unused-web"), "TEMP": str(temporary), "TMP": str(temporary), "RUST_LOG": "lilt=info,tower_http=warn"})
        python = ROOT / "analysis" / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        env["LILT_PYTHON"] = str(python.resolve(strict=True))
        self.log = (self.scratch / "server.log").open("ab")
        self.child = subprocess.Popen([str(self.binary), "serve"], cwd=ROOT, env=env,
                                      stdin=subprocess.DEVNULL, stdout=self.log, stderr=self.log,
                                      creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        readiness = None
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            if self.child.poll() is not None:
                raise AssertionError(f"scratch server exited {self.child.returncode}; see {self.scratch / 'server.log'}")
            try:
                readiness = self.api("GET", "/healthz")
                if readiness["ok"]:
                    return
            except (urllib.error.URLError, ConnectionError) as error:
                if getattr(getattr(error, "reason", error), "winerror", None) == 10013:
                    raise AssertionError("local HTTP connections are blocked by the execution permissions") from error
                readiness = str(error)
            time.sleep(0.1)
        raise AssertionError(f"scratch server did not become ready: {readiness}")

    def stop(self):
        if self.child is not None:
            self.child.terminate()
            try:
                self.child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.child.kill()
                self.child.wait(timeout=10)
            self.child = None
        if self.log is not None:
            self.log.close()
            self.log = None

    def archive(self, content, filename):
        (self.scratch / filename).write_bytes(content)
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            manifest = json.loads(archive.read("_lilt-backup.json"))
            files = {name: archive.read(name) for name in archive.namelist() if name != "_lilt-backup.json"}
        assert manifest["schema"] == "lilt.backup/1"
        assert manifest["files"] == len(files)
        assert manifest["bytes"] == sum(len(value) for value in files.values())
        for entry in manifest["entries"]:
            assert len(files[entry["path"]]) == entry["bytes"]
            assert sha(files[entry["path"]]) == entry["sha256"]
        assert not any(name.startswith((".private/", ".tmp/")) or name in ("oauth.json", "agents.json") for name in files)
        return files

    def create_backup(self):
        for _ in range(20):
            value, _, status = self.request("POST", "/api/backups", {}, expected=(200, 409))
            if status == 200:
                return value
            assert value.get("code") == "busy", value
            time.sleep(0.1)
        raise AssertionError(f"backup remained busy after completed analysis: {value}")

    def run(self):
        self.start()
        status = self.api("GET", "/api/backups")
        self.generation = status["generation"]
        self.check("fresh server has no previous backup", status["last_backup"] is None)
        for headers, expected in [({"Origin": "https://outside.invalid"}, 403),
                                  ({"Host": "rebind.invalid"}, 403),
                                  ({"Cf-Connecting-Ip": "203.0.113.1"}, 404)]:
            self.request("POST", "/api/backups", {}, headers=headers, expected=expected)
        self.check("cross-origin, hostile host and tunnel requests cannot create backups", True)
        profile = self.api("GET", "/api/profile")
        profile["room_note"] = "Saved before backup"
        profile = self.api("PUT", "/api/profile", profile)
        photo = self.api("POST", "/api/photos?name=Before", raw=PNG)
        chapter = self.api("POST", "/api/mixtape/chapter", {})
        session = self.api("POST", "/api/studio/session", {})
        take_id = str(uuid.uuid4())
        self.api("POST", "/api/takes", {"take_id": take_id, "session_id": session["id"], "role": "free", "phase": "none",
                                         "prompt_id": "ref.count-1-10", "prompt_text": "Acceptance fixture", "mime": "audio/wav", "capture": {}})
        busy = self.api("POST", "/api/backups", {}, expected=409)
        self.check("active recording blocks backup", busy["code"] == "busy")
        audio = (ROOT / "analysis/tests/fixtures/sine_220.wav").read_bytes()
        chunks = [audio[index:index + 65536] for index in range(0, len(audio), 65536)]
        for index, chunk in enumerate(chunks):
            self.api("PUT", f"/api/takes/{take_id}/chunks/{index}", raw=chunk,
                     headers={"X-Content-Sha256": sha(chunk)}, expected=201)
        self.api("POST", f"/api/takes/{take_id}/finalize", {"chunk_count": len(chunks), "interrupted": False})
        deadline = time.monotonic() + 90
        while True:
            take = self.api("GET", f"/api/takes/{take_id}")
            if take["status"] == "review_ready":
                break
            assert take["status"] != "analysis_failed", take.get("analysis_error")
            assert time.monotonic() < deadline, f"analysis timed out: {take['status']}"
            time.sleep(0.2)
        self.check("real Python analysis finishes for uploaded WAV", take["analysis_summary"]["status"] == "ok", take["analysis_summary"])
        self.api("PATCH", f"/api/takes/{take_id}", {"favourite": True, "note": "Before backup"})
        self.api("PATCH", f"/api/sessions/{session['id']}", {"notes": "Session before backup", "complete": True})
        self.api("POST", "/api/deck/review", {"card_id": "ref.daily", "take_id": take_id, "rating": "good"})
        self.api("POST", "/oauth/register", {"client_name": "Acceptance before", "redirect_uris": ["http://127.0.0.1/callback"]}, expected=201)
        backup = self.create_backup()
        backup_bytes = self.api("GET", backup["download_url"])
        original = self.archive(backup_bytes, "original.zip")
        audio_path = f"sessions/{session['id']}/recordings/{take_id}/original.wav"
        self.check("downloaded ZIP preserves WAV bytes and every manifest hash", original[audio_path] == audio)
        self.check("backup includes courses, progress, photos, analysis and notes", all(any(name.startswith(prefix) for name in original) for prefix in ("courses/", "cards/", "photos/", f"sessions/{session['id']}/analyses/")))
        self.check("backup excludes synthetic local credentials", "oauth.json" not in original and "agents.json" not in original)
        profile["room_note"] = "Changed after backup"
        self.api("PUT", "/api/profile", profile)
        self.api("DELETE", f"/api/photos/{photo['id']}")
        later_photo = self.api("POST", "/api/photos?name=After", raw=PNG + b"after")
        later_chapter = self.api("POST", "/api/mixtape/chapter", {})
        self.api("POST", "/api/deck/review", {"card_id": "ref.daily", "take_id": None, "rating": "easy"})
        self.api("DELETE", f"/api/takes/{take_id}")
        self.api("POST", "/oauth/register", {"client_name": "Acceptance after", "redirect_uris": ["http://127.0.0.1/callback"]}, expected=201)
        credentials = {name: (self.data / name).read_bytes() for name in ("oauth.json", "agents.json", ".private/acceptance.txt")}
        before_restore = {path.relative_to(self.data).as_posix(): path.read_bytes() for path in self.data.rglob("*")
                          if path.is_file() and path.relative_to(self.data).parts[0] not in (".tmp", ".private", "oauth.json", "agents.json")}
        preview = self.api("POST", "/api/backups/restore-preview", raw=backup_bytes)
        self.check("preview validates date and recording count without replacing data", preview["recordings"] == 1 and self.api("GET", "/api/profile")["room_note"] == "Changed after backup")
        invalid = self.api("POST", "/api/backups/restore-preview", raw=b"not a ZIP", expected=422)
        self.check("invalid preview is rejected", invalid["code"] == "invalid_backup")
        old_generation = self.generation
        restore = self.api("POST", "/api/backups/restore", {"id": preview["id"], "generation": old_generation, "confirm": True})
        self.generation = restore["generation"]
        self.check("restore returns a new generation and safety download", restore["restored"] and self.generation != old_generation)
        for name, contents in original.items():
            assert (self.data / name).read_bytes() == contents, f"restored bytes differ: {name}"
        self.check("all archived practice files match restored bytes exactly", True, {"files": len(original), "audio_sha256": sha(audio)})
        safety = self.archive(self.api("GET", restore["safety_backup"]["download_url"]), "safety.zip")
        self.check("safety ZIP exactly preserves pre-restore practice data", safety == before_restore)
        self.check("safety ZIP contains later edits and deleted recording stays absent", audio_path not in safety and f"photos/{later_photo['file']}" in safety and f"courses/voice/{later_chapter['file']}" in safety)
        self.check("local auth and connection files survive restore byte for byte", all((self.data / name).read_bytes() == contents for name, contents in credentials.items()))
        self.check("restored audio is served with original hash", sha(self.api("GET", f"/api/takes/{take_id}/audio")) == sha(audio))
        self.check("restored photo index uses original photo", [p["id"] for p in self.api("GET", "/api/photos")["uploaded"]] == [photo["id"]])
        self.check("course cache reopens with original chapters", self.api("GET", "/api/texts").get("levels") is not None and (self.data / f"courses/voice/{chapter['file']}").exists() and not (self.data / f"courses/voice/{later_chapter['file']}").exists())
        for generation in (False, old_generation):
            rejected = self.api("PUT", "/api/profile", profile, generation=generation, expected=409)
            assert rejected["code"] == "stale_generation"
        self.check("missing and stale generations reject browser writes", True)
        self.api("POST", "/api/backups/restore", {"id": preview["id"], "generation": old_generation, "confirm": True}, expected=409)
        self.check("consumed preview cannot restore twice", True)
        self.api("POST", "/oauth/register", {"client_name": "Acceptance after restore", "redirect_uris": ["http://127.0.0.1/callback"]}, generation=False, expected=201)
        self.check("OAuth registration still works without browser generation header", True)
        self.stop()
        self.start()
        self.check("restart preserves restored generation", self.api("GET", "/api/backups")["generation"] == self.generation)
        self.check("restart preserves restored profile and serves restored audio", self.api("GET", "/api/profile")["room_note"] == "Saved before backup" and self.api("GET", f"/api/takes/{take_id}/audio") == audio)
        self.report["passed"] = True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, default=ROOT / "server/target-backup-check/debug" / ("lilt.exe" if os.name == "nt" else "lilt"))
    args = parser.parse_args()
    test = Acceptance(args.binary)
    print(f"Scratch acceptance artifacts: {test.scratch}", flush=True)
    try:
        test.run()
    except Exception as error:
        test.report["passed"] = False
        test.report["error"] = str(error)
        raise
    finally:
        test.stop()
        (test.scratch / "report.json").write_text(json.dumps(test.report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
