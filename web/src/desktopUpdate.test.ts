import test from "node:test";
import assert from "node:assert/strict";
import { nextUpdateStep, parseDesktopUpdate, updateNotice, updateStatus, type DesktopUpdate } from "./desktopUpdate.ts";

const current: DesktopUpdate = { current: "0.2.1", phase: "idle", version: null, failed: false, error: null, notes: null, progress: null };

test("desktop status rejects malformed data instead of inventing an installed version", () => {
  for (const value of [undefined, null, [], "0.2.1", {}, { ...current, current: "" }, { ...current, current: 21 }, { ...current, phase: "unknown" }, { ...current, failed: "false" }, { ...current, version: {} }]) {
    assert.equal(parseDesktopUpdate(value), null);
  }
  assert.deepEqual(parseDesktopUpdate(current), current);
});

test("only active update phases retain a version from the native projection", () => {
  for (const phase of ["available", "downloading", "ready", "installing"] as const) {
    const state = { ...current, phase, version: "0.2.2" };
    assert.deepEqual(parseDesktopUpdate(state), state);
  }
  for (const phase of ["idle", "checking", "up_to_date", "unconfigured"] as const) {
    assert.deepEqual(parseDesktopUpdate({ ...current, phase, version: "0.2.2" }), { ...current, phase });
  }
});

test("Settings describes waiting and every native phase without assuming an update check succeeded", () => {
  assert.match(updateStatus(null), /waiting/i);
  const expected = {
    idle: /not checked/i, checking: /checking/i, up_to_date: /up to date/i,
    available: /0\.2\.2 is available/i, downloading: /downloading Lilt 0\.2\.2/i,
    ready: /0\.2\.2 is downloaded and ready to install/i, installing: /updating Lilt/i,
    unconfigured: /not configured/i,
  };
  for (const [phase, expression] of Object.entries(expected)) {
    assert.match(updateStatus({ ...current, phase: phase as DesktopUpdate["phase"], version: "0.2.2" }), expression);
  }
  assert.match(updateStatus({ ...current, failed: true }), /couldn.t check/i);
  assert.doesNotMatch(updateStatus({ ...current, failed: true }), /up to date/i);
});

test("older apps without error, notes or progress still read, and bad values are refused", () => {
  const old = { current: "0.2.1", phase: "available", version: "0.2.2", failed: false };
  assert.deepEqual(parseDesktopUpdate(old), { ...old, error: null, notes: null, progress: null });
  for (const bad of [{ progress: 101 }, { progress: 2.5 }, { progress: "50" }, { notes: 7 }, { error: "x".repeat(1001) }]) {
    assert.equal(parseDesktopUpdate({ ...old, ...bad }), null, JSON.stringify(bad));
  }
  const full = parseDesktopUpdate({ ...old, phase: "downloading", failed: true, error: "Couldn't download.", notes: "A quiet update.", progress: 40 });
  assert.deepEqual([full?.error, full?.notes, full?.progress], ["Couldn't download.", "A quiet update.", 40]);
  assert.equal(parseDesktopUpdate({ ...old, phase: "idle", error: "stale", notes: "stale", progress: 40 })?.notes, null);
});

test("each state offers one next step, and none while a step runs", () => {
  const step = (phase: DesktopUpdate["phase"], version: string | null = "0.2.2") => nextUpdateStep({ ...current, phase, version })?.step ?? null;
  assert.equal(nextUpdateStep(null), null);
  assert.deepEqual([step("idle"), step("up_to_date"), step("available"), step("ready")], ["check", "check", "download", "install"]);
  for (const phase of ["checking", "downloading", "installing", "unconfigured"] as const) assert.equal(step(phase), null, phase);
  assert.equal(nextUpdateStep({ ...current, phase: "available", version: "0.2.2" })?.label, "Download Lilt 0.2.2");
  assert.equal(nextUpdateStep({ ...current, phase: "ready", version: "0.2.2" })?.label, "Install and restart");
});

test("download progress shows in the status and the notice", () => {
  const s = { ...current, phase: "downloading" as const, version: "0.2.2", progress: 42 };
  assert.match(updateStatus(s), /Downloading Lilt 0\.2\.2… 42%/);
  assert.match(updateNotice(s)!.body, /^42% so far/);
  assert.equal(updateNotice(s)!.title, "Downloading Lilt 0.2.2");
});

test("one notification identity follows the update from offer to install, and opens Settings", () => {
  const titles: string[] = [];
  for (const phase of ["available", "downloading", "ready", "installing"] as const) {
    const notice = updateNotice({ ...current, phase, version: "0.2.2", failed: true });
    assert.equal(notice?.id, "app-update-0.2.2");
    assert.equal(notice?.to, "/settings/updates");
    titles.push(notice!.title);
  }
  assert.deepEqual(titles, ["Lilt 0.2.2 is available", "Downloading Lilt 0.2.2", "Lilt 0.2.2 is ready to install", "Updating Lilt"]);
  assert.notEqual(updateNotice({ ...current, phase: "available", version: "0.2.3" })?.id, "app-update-0.2.2");
});

test("unknown, failed checks and already installed versions make no update notice", () => {
  assert.equal(updateNotice(null), null);
  for (const phase of ["idle", "checking", "up_to_date", "unconfigured"] as const) {
    assert.equal(updateNotice({ ...current, phase, version: "0.2.2", failed: true }), null);
  }
  assert.equal(updateNotice({ ...current, phase: "available", version: null }), null);
  assert.equal(updateNotice({ ...current, phase: "ready", version: current.current }), null);
});
