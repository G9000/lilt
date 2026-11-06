import test from "node:test";
import assert from "node:assert/strict";
import { parseDesktopUpdate, updateNotice, updateStatus, type DesktopUpdate } from "./desktopUpdate.ts";

const current: DesktopUpdate = { current: "0.2.1", phase: "idle", version: null, failed: false };

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
    ready: /0\.2\.2 is ready to install/i, installing: /updating Lilt/i,
    unconfigured: /not configured/i,
  };
  for (const [phase, expression] of Object.entries(expected)) {
    assert.match(updateStatus({ ...current, phase: phase as DesktopUpdate["phase"], version: "0.2.2" }), expression);
  }
  assert.match(updateStatus({ ...current, failed: true }), /couldn.t check/i);
  assert.doesNotMatch(updateStatus({ ...current, failed: true }), /up to date/i);
});

test("failed download or blocked installation still shows the available version", () => {
  for (const phase of ["available", "ready"] as const) {
    const status = updateStatus({ ...current, phase, version: "0.2.2", failed: true });
    assert.match(status, /0\.2\.2/);
    assert.match(status, /open app updates/i);
  }
});

test("one notification identity survives repeated checks, downloading and readiness", () => {
  for (const phase of ["available", "downloading", "ready", "installing"] as const) {
    const notice = updateNotice({ ...current, phase, version: "0.2.2", failed: true });
    assert.equal(notice?.id, "app-update-0.2.2");
    assert.equal(notice?.title, "Lilt 0.2.2 is available");
    assert.equal(notice?.to, "lilt://updates");
  }
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
