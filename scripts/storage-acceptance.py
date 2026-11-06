"""Real loopback storage acceptance against a fresh target-contained scratch server.

Build with cargo build --manifest-path server/Cargo.toml --target-dir server/target-backup-check,
then run analysis/.venv/Scripts/python.exe scripts/storage-acceptance.py.
The exact child process is stopped; artifacts remain under target/storage-network-*.
No owner data, folder opener, browser, microphone or remote provider is used.
"""

import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
TOKEN = "synthetic-storage-desktop-token"


def size_and_count(root):
    files = [path for path in root.rglob("*") if path.is_file()]
    return sum(path.stat().st_size for path in files), len(files)


def independent_totals(data, control):
    total_data, files_data = size_and_count(data)
    recordings = [size_and_count(path) for name in ("recordings", "analyses")
                  for path in (data / "sessions").glob(f"*/{name}") if path.is_dir()]
    recording_bytes = sum(value[0] for value in recordings)
    recording_files = sum(value[1] for value in recordings)
    photos = size_and_count(data / "photos")
    backups = size_and_count(control)
    return {
        "recordings": (recording_bytes, recording_files),
        "photos": photos,
        "backups": backups,
        "other": (total_data - recording_bytes - photos[0], files_data - recording_files - photos[1]),
    }


class Acceptance:
    def __init__(self, binary):
        target = ROOT / "target"
        target.mkdir(exist_ok=True)
        self.scratch = Path(tempfile.mkdtemp(prefix="storage-network-", dir=target))
        self.data = self.scratch / "data"
        self.binary = binary.resolve(strict=True)
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            self.port = sock.getsockname()[1]
        assert self.port != 7878
        self.base = f"http://127.0.0.1:{self.port}"
        self.child = None
        self.log = None
        self.report = {"scratch": str(self.scratch), "binary": str(self.binary),
                       "port": self.port, "checks": [], "folder_open_attempted": False}

    def check(self, name, condition, detail=None):
        self.report["checks"].append({"name": name, "passed": bool(condition), "detail": detail})
        print(f"{'PASS' if condition else 'FAIL'} {name}", flush=True)
        assert condition, f"{name}: {detail}"

    def request(self, path, *, headers=None, expected=200):
        request = urllib.request.Request(self.base + path, headers=headers or {})
        try:
            response = urllib.request.urlopen(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            status, content = response.status, response.read()
        assert status == expected, f"{path}: HTTP {status}: {content[:500]!r}"
        try:
            return json.loads(content)
        except (ValueError, UnicodeDecodeError):
            return content

    def start(self):
        env = {key: value for key, value in os.environ.items() if not key.startswith("LILT_")}
        temporary = self.scratch / "temp"
        temporary.mkdir()
        env.update({"LILT_DATA_DIR": str(self.data), "LILT_BIND": f"127.0.0.1:{self.port}",
                    "LILT_CONTENT_DIR": str(ROOT / "content"), "LILT_ANALYSIS_DIR": str(ROOT / "analysis"),
                    "LILT_WEB_DIR": str(self.scratch / "unused-web"), "LILT_DESKTOP_TOKEN": TOKEN,
                    "LILT_MCP_TOKEN": "synthetic-storage-mcp-token", "TEMP": str(temporary), "TMP": str(temporary)})
        self.log = (self.scratch / "server.log").open("wb")
        self.child = subprocess.Popen([str(self.binary), "serve"], cwd=ROOT, env=env,
                                      stdin=subprocess.DEVNULL, stdout=self.log, stderr=self.log,
                                      creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            assert self.child.poll() is None, f"scratch server exited; see {self.scratch / 'server.log'}"
            try:
                if self.request("/healthz")["ok"]:
                    return
            except (urllib.error.URLError, ConnectionError):
                pass
            time.sleep(0.1)
        raise AssertionError("scratch server did not become ready")

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

    def run(self):
        self.start()
        initial = self.request("/api/storage")
        control = Path(initial["backup_path"])
        self.check("reported data root is the configured scratch folder", Path(initial["data_path"]).samefile(self.data))
        self.check("actual control root is an existing scratch sibling", control.is_dir() and control.parent.samefile(self.scratch) and not control.samefile(self.data))
        fixtures = {
            self.data / "sessions/synthetic/recordings/t/storage-audio-sentinel.wav": b"synthetic original recording",
            self.data / "sessions/synthetic/analyses/storage-analysis-sentinel.json": b"synthetic derived analysis",
            self.data / "photos/storage-photo-sentinel.png": b"synthetic photo bytes",
            self.data / ".private/storage-private-sentinel": b"PRIVATE_CONTENT_MUST_NOT_LEAK",
            self.data / "unknown/storage-unknown-sentinel": b"UNKNOWN_CONTENT_MUST_NOT_LEAK",
            self.data / "sessions/synthetic/recordings-lookalike/storage-lookalike-sentinel": b"other saved data",
            control / "storage-archive-sentinel.zip": b"synthetic stored backup",
            control / "stage-synthetic/private/storage-preview-sentinel": b"synthetic staged preview",
            control / "previous-synthetic/storage-recovery-sentinel": b"synthetic prior-root recovery",
        }
        for path, content in fixtures.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        overview = self.request("/api/storage")
        expected = independent_totals(self.data, control)
        actual = {category["id"]: (category["bytes"], category["files"]) for category in overview["categories"]}
        self.check("category order matches the contract", list(actual) == ["recordings", "photos", "backups", "other"])
        self.check("ordinary scratch scan is complete", overview["complete"] and overview["skipped_entries"] == 0)
        for category in expected:
            self.check(f"{category} byte and file totals match independent filesystem metadata", actual[category] == expected[category], {"actual": actual[category], "expected": expected[category]})
        self.check("overall total equals all filesystem lengths and category sum", overview["total_bytes"] == sum(value[0] for value in expected.values()) == sum(value[0] for value in actual.values()))
        serialized = json.dumps(overview)
        self.check("response includes no synthetic private contents or per-file names", all(path.name not in serialized and content.decode() not in serialized for path, content in fixtures.items()))
        delta_file = self.data / ".private/storage-refresh-sentinel"
        delta_file.write_bytes(b"x" * 173)
        added = self.request("/api/storage")
        self.check("refresh includes a newly added private file", added["total_bytes"] == overview["total_bytes"] + 173 and added["categories"][3]["bytes"] == overview["categories"][3]["bytes"] + 173)
        delta_file.unlink()
        self.check("refresh reflects file removal", self.request("/api/storage")["total_bytes"] == overview["total_bytes"])
        for token in (None, "wrong", "synthetic-storage-mcp-token"):
            headers = {} if token is None else {"Authorization": f"Bearer {token}"}
            self.request("/api/desktop/data-folder", headers=headers, expected=403)
        self.check("folder descriptor rejects missing wrong and MCP tokens", True)
        auth = {"Authorization": f"Bearer {TOKEN}"}
        descriptor = self.request("/api/desktop/data-folder?path=C:/untrusted&url=https://outside.invalid", headers=auth)
        self.check("authenticated descriptor only returns configured canonical path despite query inputs", set(descriptor) == {"path"} and Path(descriptor["path"]).is_absolute() and Path(descriptor["path"]).samefile(self.data))
        for path in ("/api/storage", "/api/desktop/data-folder"):
            for headers, status in [({"Origin": "https://outside.invalid"}, 403), ({"Host": "rebind.invalid"}, 403), ({"Cf-Connecting-Ip": "203.0.113.1"}, 404)]:
                self.request(path, headers={**auth, **headers}, expected=status)
            self.check(f"{path} rejects hostile origin host and tunnel requests", True)
        (self.scratch / "storage-response.json").write_text(json.dumps(overview, indent=2) + "\n", encoding="utf-8")
        self.report["passed"] = True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, default=ROOT / "server/target-backup-check/debug" / ("lilt.exe" if os.name == "nt" else "lilt"))
    test = Acceptance(parser.parse_args().binary)
    print(f"Scratch acceptance artifacts: {test.scratch}", flush=True)
    try:
        test.run()
    except Exception as error:
        test.report.update({"passed": False, "error": str(error)})
        raise
    finally:
        test.stop()
        (test.scratch / "report.json").write_text(json.dumps(test.report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
